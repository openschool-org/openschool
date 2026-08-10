ALTER TABLE prefects DROP CONSTRAINT prefects_rank_check;
ALTER TABLE prefects ADD CONSTRAINT prefects_rank_check
    CHECK (rank IN ('junior', 'senior', 'deputy_head', 'head'));
