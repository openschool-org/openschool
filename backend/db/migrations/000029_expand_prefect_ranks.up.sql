-- add House Captain / Vice House Captain to the existing rank set
-- (Head Prefect / Deputy Head Prefect / Senior Prefect / Junior Prefect
-- already existed as 'head' / 'deputy_head' / 'senior' / 'junior').
ALTER TABLE prefects DROP CONSTRAINT prefects_rank_check;
ALTER TABLE prefects ADD CONSTRAINT prefects_rank_check
    CHECK (rank IN ('junior', 'senior', 'deputy_head', 'head', 'house_captain', 'vice_house_captain'));
