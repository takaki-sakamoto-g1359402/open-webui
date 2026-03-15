CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY,
  organization TEXT NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT,
  priority_rank INT NOT NULL,
  trust_tier TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS source_documents (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES sources(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at DATE,
  retrieved_at TIMESTAMPTZ NOT NULL,
  checksum TEXT,
  content_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS source_chunks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES source_documents(id),
  chunk_index INT NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS indicators (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  pillar TEXT NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  direction TEXT NOT NULL,
  definition TEXT NOT NULL,
  source_preference JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS geographies (
  id UUID PRIMARY KEY,
  iso3 TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  region TEXT,
  income_group TEXT
);

CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES indicators(id),
  geography_id UUID NOT NULL REFERENCES geographies(id),
  source_document_id UUID NOT NULL REFERENCES source_documents(id),
  observation_year INT NOT NULL,
  value NUMERIC NOT NULL,
  is_modeled BOOLEAN NOT NULL DEFAULT FALSE,
  uncertainty NUMERIC,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS methodologies (
  id UUID PRIMARY KEY,
  version TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  weights JSONB NOT NULL,
  transform_registry JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scorecards (
  id UUID PRIMARY KEY,
  geography_id UUID NOT NULL REFERENCES geographies(id),
  methodology_id UUID NOT NULL REFERENCES methodologies(id),
  score NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL,
  score_year INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS score_explanations (
  id UUID PRIMARY KEY,
  scorecard_id UUID NOT NULL REFERENCES scorecards(id),
  pillar TEXT NOT NULL,
  pillar_score NUMERIC,
  weight NUMERIC NOT NULL,
  formula TEXT NOT NULL,
  confidence_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY,
  source_id UUID NOT NULL REFERENCES sources(id),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  records_processed INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY,
  claim_type TEXT NOT NULL,
  claim_id UUID NOT NULL,
  source_document_id UUID NOT NULL REFERENCES source_documents(id),
  source_chunk_id UUID REFERENCES source_chunks(id),
  quote TEXT,
  locator TEXT,
  confidence NUMERIC
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
