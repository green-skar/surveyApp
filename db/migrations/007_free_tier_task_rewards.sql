-- Tier 1 (free) starter tasks: total reward ~$13.50 across tasks 1–3 (within $13–$14 band).
UPDATE public.tasks AS t
SET
  reward = v.reward,
  reward_cents = v.reward_cents
FROM (VALUES
  (1, 4.00::numeric, 400),
  (2, 4.50::numeric, 450),
  (3, 5.00::numeric, 500)
) AS v(id, reward, reward_cents)
WHERE t.id = v.id;
