// Database connection pool + auto-migrations
const { Pool } = require('pg');
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production' || !process.env.DATABASE_URL?.includes('localhost');

const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/rementally';
const isNeon = dbUrl.includes('neon.tech');
const isSupabase = dbUrl.includes('supabase');

const pool = new Pool({
  connectionString: dbUrl,
  // Neon/Supabase require SSL; Render local dev does not
  ssl: (isNeon || isSupabase || isProd) ? { rejectUnauthorized: false } : false,
  max: isProd ? 3 : 10, // Prevent connection limits during rolling deploys on free tier DBs
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// Run all migrations on startup
async function runMigrations(retries = 5) {
  let client;
  while (retries > 0) {
    try {
      client = await pool.connect();
      break; // Successfully connected
    } catch (err) {
      console.error('[DB] Connection failed:', err);
      retries -= 1;
      if (retries === 0) throw err;
      await new Promise(res => setTimeout(res, 5000)); // wait 5s before retrying
    }
  }

  try {
    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector').catch(e => console.warn('[DB] Warning: Could not create vector extension:', e.message));

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'managed', 'premium', 'enterprise', 'admin')),
        daily_runs_used INT DEFAULT 0,
        daily_runs_limit INT DEFAULT 10,
        total_credits INT DEFAULT 0,
        api_keys JSONB DEFAULT '{}',
        notification_prefs JSONB DEFAULT '{}',
        witness_contacts JSONB DEFAULT '[]',
        location JSONB DEFAULT '{}',
        is_admin BOOLEAN DEFAULT false,
        razorpay_customer_id VARCHAR(255),
        revenuecat_subscriber_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'none',
        last_run_reset TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for users
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

    // Memory graph table (knowledge graph + Phase 8 columns)
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_graph (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        source VARCHAR(100) DEFAULT 'user',
        category VARCHAR(100),
        importance FLOAT DEFAULT 0.5,
        access_count INT DEFAULT 0,
        embedding vector(1536),
        -- Phase 8 cognitive columns
        cognitive_load VARCHAR(50),
        theme VARCHAR(100),
        half_life_hours FLOAT,
        urgency_tier VARCHAR(20),
        decay_status VARCHAR(20) DEFAULT 'active',
        expires_at TIMESTAMPTZ,
        escalated_at TIMESTAMPTZ,
        commitment_deadline TIMESTAMPTZ,
        commitment_witness TEXT,
        commitment_fulfilled BOOLEAN DEFAULT false,
        brain_area VARCHAR(50),
        emotional_tone VARCHAR(50),
        related_person VARCHAR(255),
        location_tag VARCHAR(255),
        drift_score FLOAT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for memory_graph
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_user ON memory_graph(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_category ON memory_graph(user_id, category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_decay ON memory_graph(user_id, decay_status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_commitment ON memory_graph(user_id, commitment_deadline)');
    await client.query('ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ').catch(() => {});
    await client.query('CREATE INDEX IF NOT EXISTS idx_memory_expires ON memory_graph(user_id, expires_at)').catch(() => {});

    // Create vector index for similarity search (ivfflat, requires at least 1000 rows to be effective)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_embedding
      ON memory_graph USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10)
    `).catch(() => {}); // Ignore if not enough rows yet

    // Channels table (messaging platform config)
    await client.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        display_name VARCHAR(255),
        credentials TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        webhook_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, platform)
      )
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        channel VARCHAR(50) DEFAULT 'browser',
        title VARCHAR(255),
        message TEXT NOT NULL,
        delivered BOOLEAN DEFAULT false,
        read BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        sent_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id, read)');

    // Billing transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS billing_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2),
        currency VARCHAR(10) DEFAULT 'USD',
        runs_credited INT DEFAULT 0,
        razorpay_order_id VARCHAR(255),
        razorpay_payment_id VARCHAR(255),
        razorpay_signature VARCHAR(255),
        revenuecat_transaction_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_transactions(user_id)');

    // API key audit log
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_key_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        action VARCHAR(20) NOT NULL,
        masked_key VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // User boosters table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_boosters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        bundle_name VARCHAR(50) NOT NULL,
        total_runs INT NOT NULL,
        runs_used INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_boosters_user ON user_boosters(user_id)');

    // ── Migrate old tier names to new ones ──────────────────────────────────────
    await client.query("UPDATE users SET tier = 'pro' WHERE tier = 'premium'").catch(() => {});
    await client.query("UPDATE users SET tier = 'managed' WHERE tier = 'enterprise'").catch(() => {});

    // ── Phase 8 feature columns (ALTER TABLE for existing installs) ─────────────
    const alterCols = [
      // Columns referenced by process.js / memory.js that must exist
      "ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS entity VARCHAR(100) DEFAULT 'user'",
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS attribute VARCHAR(255)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS value TEXT',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS deadline_epoch BIGINT',
      // Phase 8 feature columns
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_departure_brief_sent_at TIMESTAMPTZ',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS data_sharing BOOLEAN DEFAULT true',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS web_search BOOLEAN DEFAULT true',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS notified_tier INTEGER DEFAULT 0',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'pending\'',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS witness_contact TEXT',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS witness_notified BOOLEAN DEFAULT false',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS intent VARCHAR(100)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS llm_response TEXT',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS action_verb VARCHAR(50)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS is_actionable BOOLEAN DEFAULT false',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS context_note TEXT',
      // Geofences support
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS geofences JSONB DEFAULT \'[]\'',
      // New cognitive classification columns
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS cognitive_load VARCHAR(50)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS theme VARCHAR(100)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS brain_area VARCHAR(50)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS emotional_tone VARCHAR(50)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS related_person VARCHAR(255)',
      'ALTER TABLE memory_graph ADD COLUMN IF NOT EXISTS location_tag VARCHAR(255)',
      // Booster columns
      'ALTER TABLE user_boosters ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL \'30 days\'',
      // ── User Profile columns ──────────────────────────────────────────────────
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)',
    ];
    for (const sql of alterCols) {
      await client.query(sql).catch(() => {});
    }

    // Unique index on username (case-insensitive)
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(lower(username)) WHERE username IS NOT NULL').catch(() => {});

    // ── Waitlist table (early access signups from pricing page) ──────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        plan VARCHAR(50) DEFAULT 'pro',
        email_sent BOOLEAN DEFAULT false,
        country VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await client.query('ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS country VARCHAR(100)').catch(() => {});
    await client.query('CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email)').catch(() => {});

    // ── Audit log table (tracks sensitive operations) ─────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(255),
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)');

    // ── Thought Traces (replaces Langfuse) ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS thought_traces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trace_id UUID NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        thought_id UUID REFERENCES memory_graph(id) ON DELETE CASCADE,
        span_name VARCHAR(100),
        input JSONB,
        output JSONB,
        status VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_traces_trace ON thought_traces(trace_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_traces_thought ON thought_traces(thought_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_traces_user ON thought_traces(user_id)');

    // ── Thought Revivals (Serverless Interceptor Queue) ─────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS thought_revivals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        thought_id UUID REFERENCES memory_graph(id) ON DELETE CASCADE,
        thought JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, thought_id)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_revivals_user ON thought_revivals(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_revivals_expires ON thought_revivals(expires_at)');

    // ── Shared Memories (Collaborative Graph) ─────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        shared_with_id UUID REFERENCES users(id) ON DELETE CASCADE,
        memory_id UUID REFERENCES memory_graph(id) ON DELETE CASCADE,
        permission VARCHAR(20) DEFAULT 'view' CHECK (permission IN ('view', 'comment', 'edit')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(owner_id, shared_with_id, memory_id)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_shared_owner ON shared_memories(owner_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_shared_with ON shared_memories(shared_with_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_shared_memory ON shared_memories(memory_id)');

    // ── Analytics Events (Cross-User Patterns) ───────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        anonymized_hash VARCHAR(64),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at)');

    // ── Agent Preferences column ─────────────────────────────────────────────
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_preferences JSONB DEFAULT '{}'`);

    // ── Recent Activities (Attention Layer) ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS recent_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        summary TEXT,
        metadata JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_activities_user ON recent_activities(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_activities_unread ON recent_activities(user_id, is_read)');

    // ── Shared API Keys (Admin-Managed Pool) ──────────────────────────────
    // Admin-configured API keys shared across all users. Users never see these
    // keys — they are used automatically when the user has no BYO key for a
    // given provider. Supports per-user run limits enforced at the app layer.
    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(50) NOT NULL,
        encrypted_key TEXT NOT NULL,
        masked_key VARCHAR(50) NOT NULL,
        endpoint VARCHAR(500),
        model VARCHAR(100),
        rate_limit INT DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_shared_keys_provider ON shared_api_keys(provider, is_active)');

    // ── Knowledge Graph (Auto-construction) ────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_entities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('person', 'organization', 'project', 'location', 'topic', 'tool', 'event', 'other')),
        metadata JSONB DEFAULT '{}',
        mention_count INT DEFAULT 1,
        first_mentioned TIMESTAMPTZ DEFAULT NOW(),
        last_mentioned TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, name, entity_type)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_ke_user ON knowledge_entities(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ke_type ON knowledge_entities(user_id, entity_type)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_relationships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
        target_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
        relationship_type VARCHAR(100) NOT NULL,
        strength FLOAT DEFAULT 1.0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, source_entity_id, target_entity_id, relationship_type)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_kr_user ON knowledge_relationships(user_id)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_mentions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        thought_id UUID REFERENCES memory_graph(id) ON DELETE SET NULL,
        entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
        context TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_km_user ON knowledge_mentions(user_id)');

    // ── Thought Clustering ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_clusters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label VARCHAR(255) NOT NULL,
        thought_count INT DEFAULT 0,
        keywords JSONB DEFAULT '[]',
        first_thought_at TIMESTAMPTZ,
        last_thought_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_kc_user ON knowledge_clusters(user_id)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS thought_cluster_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        thought_id UUID NOT NULL REFERENCES memory_graph(id) ON DELETE CASCADE,
        cluster_id UUID NOT NULL REFERENCES knowledge_clusters(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, thought_id, cluster_id)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_tca_user ON thought_cluster_assignments(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tca_cluster ON thought_cluster_assignments(cluster_id)');

    // ── Row-Level Security (RLS) ──────────────────────────────────────────
	    // RLS enforces tenant isolation at the database level. Every query against
	    // a protected table is automatically filtered to the current user's rows
	    // based on the `app.user_id` session variable set by authMiddleware.
	    //
	    // Enable by setting ENABLE_RLS=true in your environment. When disabled,
	    // tenant isolation relies on the application layer (authMiddleware scoping
	    // all queries by user_id), which is sufficient but lacks defense-in-depth.
	    //
	    // RLS is safe to enable now because authMiddleware (src/auth.js) sets
	    // app.user_id via set_config() on every authenticated request.

	    if (process.env.ENABLE_RLS === 'true') {
	      // Enable RLS on tenant-isolated tables
	      const rlsTables = [
	        'memory_graph',
	        'channels',
	        'notifications',
	        'billing_transactions',
	        'thought_revivals',
	        'shared_memories',
	        'recent_activities',
	      ];
	      for (const table of rlsTables) {
	        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`).catch(() => {});
	      }

	      // Create RLS policies — each ensures the user can only see/modify their own rows.
	      // The USING clause applies to SELECT, UPDATE, DELETE; WITH CHECK applies to INSERT.
	      const policies = [
	        {
	          table: 'memory_graph',
	          sql: `CREATE POLICY user_isolation ON memory_graph
	                USING (user_id::text = current_setting('app.user_id', true))
	                WITH CHECK (user_id::text = current_setting('app.user_id', true))`,
	        },
	        {
	          table: 'channels',
	          sql: `CREATE POLICY user_isolation ON channels
	                USING (user_id::text = current_setting('app.user_id', true))
	                WITH CHECK (user_id::text = current_setting('app.user_id', true))`,
	        },
	        {
	          table: 'notifications',
	          sql: `CREATE POLICY user_isolation ON notifications
	                USING (user_id::text = current_setting('app.user_id', true))
	                WITH CHECK (user_id::text = current_setting('app.user_id', true))`,
	        },
	        {
	          table: 'billing_transactions',
	          sql: `CREATE POLICY user_isolation ON billing_transactions
	                USING (user_id::text = current_setting('app.user_id', true))
	                WITH CHECK (user_id::text = current_setting('app.user_id', true))`,
	        },
	        {
	          table: 'thought_revivals',
	          sql: `CREATE POLICY user_isolation ON thought_revivals
	                USING (user_id::text = current_setting('app.user_id', true))
	                WITH CHECK (user_id::text = current_setting('app.user_id', true))`,
	        },
	        {
	          table: 'shared_memories',
	          sql: `CREATE POLICY user_isolation ON shared_memories
	                USING (owner_id::text = current_setting('app.user_id', true) OR
	                       shared_with_id::text = current_setting('app.user_id', true))
	                WITH CHECK (owner_id::text = current_setting('app.user_id', true))`,
	        },
	        {
	          table: 'recent_activities',
	          sql: `CREATE POLICY user_isolation ON recent_activities
	                USING (user_id::text = current_setting('app.user_id', true))
	                WITH CHECK (user_id::text = current_setting('app.user_id', true))`,
	        },
	      ];

	      for (const policy of policies) {
	        // Drop existing policy first to make this idempotent
	        await client.query(`DROP POLICY IF EXISTS user_isolation ON ${policy.table}`).catch(() => {});
	        await client.query(policy.sql).catch((e) => {
	          console.warn(`[DB] Warning: Could not create RLS policy on ${policy.table}:`, e.message);
	        });
	      }

	      console.log('[DB] RLS enabled with user isolation on 7 tables');
	    } else {
	      // RLS is off — app-level isolation still applies (all queries scope by user_id).
	      // This is the safe default for development and single-tenant deployments.
	      const rlsDisableStatements = [
	        'ALTER TABLE IF EXISTS memory_graph DISABLE ROW LEVEL SECURITY',
	        'ALTER TABLE IF EXISTS channels DISABLE ROW LEVEL SECURITY',
	        'ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY',
	        'ALTER TABLE IF EXISTS billing_transactions DISABLE ROW LEVEL SECURITY',
	        'ALTER TABLE IF EXISTS thought_revivals DISABLE ROW LEVEL SECURITY',
	        'ALTER TABLE IF EXISTS shared_memories DISABLE ROW LEVEL SECURITY',
	        'ALTER TABLE IF EXISTS recent_activities DISABLE ROW LEVEL SECURITY',
	      ];
	      for (const sql of rlsDisableStatements) {
	        await client.query(sql).catch(() => {});
	      }
	    }

	    // ── Cognitive Sprints (Adaptive Focus Periods) ────────────────────────
    // Sprint sessions track energy-aware focus periods with ML-calibrated durations.
    await client.query(`
      CREATE TABLE IF NOT EXISTS cognitive_sprints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        thought_id UUID REFERENCES memory_graph(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
        recommended_minutes INT NOT NULL,
        actual_minutes INT DEFAULT 0,
        energy_at_start FLOAT DEFAULT 0.5,
        energy_at_end FLOAT,
        completed_thoughts INT DEFAULT 0,
        interruption_count INT DEFAULT 0,
        focus_score FLOAT DEFAULT 0,
        peak_detected BOOLEAN DEFAULT false,
        metadata JSONB DEFAULT '{}',
        started_at TIMESTAMPTZ DEFAULT NOW(),
        ended_at TIMESTAMPTZ
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_cs_user ON cognitive_sprints(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cs_status ON cognitive_sprints(user_id, status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cs_started ON cognitive_sprints(user_id, started_at)');

    // ── Achievements (Behavior-Change Milestones) ─────────────────────────
    // Achievements reward behavior change, not app usage. No login streaks, no spam.
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_key VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('focus', 'quality', 'consistency', 'cognitive', 'social')),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(50) DEFAULT 'emoji_events',
        unlocked_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        UNIQUE(user_id, achievement_key)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_ach_user ON achievements(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ach_category ON achievements(user_id, category)');

    // ── Sprint Stats (Aggregated ML Data) ─────────────────────────────────
    // Stores computed metrics for the achievement system to query efficiently.
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sprint_stats (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_sprints INT DEFAULT 0,
        total_focus_minutes INT DEFAULT 0,
        avg_focus_score FLOAT DEFAULT 0,
        longest_sprint_minutes INT DEFAULT 0,
        best_energy_at_start FLOAT DEFAULT 0,
        peak_hours_detected JSONB DEFAULT '[]',
        cognitive_debt_cleared INT DEFAULT 0,
        thoughts_completed_in_sprints INT DEFAULT 0,
        consecutive_sprint_days INT DEFAULT 0,
        last_sprint_date DATE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── User Channel ID mapping (global bot recognition) ────────────────────
	    // Maps platform-specific user IDs (Telegram chat_id, Discord user_id, etc.)
	    // to ReMentally user UUIDs so global bots can recognize inbound messages.
	    await client.query(`
	      CREATE TABLE IF NOT EXISTS user_channel_ids (
	        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
	        platform VARCHAR(50) NOT NULL,
	        platform_user_id VARCHAR(255) NOT NULL,
	        created_at TIMESTAMPTZ DEFAULT NOW(),
	        UNIQUE(platform, platform_user_id)
	      )
	    `).catch(() => {});
	    await client.query('CREATE INDEX IF NOT EXISTS idx_channel_ids_user ON user_channel_ids(user_id)');
	    await client.query('CREATE INDEX IF NOT EXISTS idx_channel_ids_platform ON user_channel_ids(platform, platform_user_id)');

	    // ── Audit log auto-prune (entries older than 30 days) ──────────────────────
    // Runs once on startup
    await client.query("DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '30 days'").catch(() => {});

    console.log('[DB] All migrations completed successfully');
  } catch (err) {
    console.error('[DB] Migration error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Daily run reset cron (runs every hour, resets users whose last_run_reset > 24h ago)
async function resetDailyRuns() {
  try {
    const result = await pool.query(`
      UPDATE users
      SET daily_runs_used = 0, last_run_reset = NOW()
      WHERE last_run_reset < NOW() - INTERVAL '24 hours'
    `);
    if (result.rowCount > 0) {
      console.log(`[DB] Reset daily runs for ${result.rowCount} users`);
    }
  } catch (err) {
    console.error('[DB] Daily run reset error:', err.message);
  }
}

// Note: resetDailyRuns is now executed by the native /api/cron/tick serverless endpoint

module.exports = { pool, runMigrations, resetDailyRuns };
