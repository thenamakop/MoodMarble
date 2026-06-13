DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mood_type') THEN
    CREATE TYPE mood_type AS ENUM (
      'energised',
      'happy',
      'calm',
      'focused',
      'neutral',
      'tired',
      'stressed',
      'sad',
      'unheard'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role') THEN
    CREATE TYPE team_role AS ENUM ('member', 'manager', 'admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  name text NOT NULL,
  join_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS workspaces_join_code_unique
  ON workspaces (join_code);

CREATE TABLE IF NOT EXISTS teams (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teams_workspace_id_idx
  ON teams (workspace_id);

CREATE TABLE IF NOT EXISTS team_members (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  device_token uuid NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS team_members_device_token_unique
  ON team_members (device_token);

CREATE INDEX IF NOT EXISTS team_members_team_id_idx
  ON team_members (team_id);

CREATE TABLE IF NOT EXISTS mood_submissions (
  id text PRIMARY KEY,
  team_id text NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  mood_type mood_type NOT NULL,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  note_hash text,
  hour_of_day smallint NOT NULL,
  submission_date date NOT NULL
);

CREATE INDEX IF NOT EXISTS mood_submissions_team_id_idx
  ON mood_submissions (team_id);

CREATE INDEX IF NOT EXISTS mood_submissions_submission_date_idx
  ON mood_submissions (submission_date);

CREATE INDEX IF NOT EXISTS mood_submissions_hour_of_day_idx
  ON mood_submissions (hour_of_day);

CREATE INDEX IF NOT EXISTS mood_submissions_mood_type_idx
  ON mood_submissions (mood_type);
