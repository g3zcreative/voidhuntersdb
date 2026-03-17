
-- Create contributions table for the review/approval workflow
CREATE TABLE public.contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id uuid NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

-- Contributors can insert their own contributions
CREATE POLICY "Contributors can insert own contributions"
  ON public.contributions FOR INSERT
  TO authenticated
  WITH CHECK (contributor_id = auth.uid() AND public.has_role(auth.uid(), 'contributor'));

-- Contributors can view their own contributions
CREATE POLICY "Contributors can view own contributions"
  ON public.contributions FOR SELECT
  TO authenticated
  USING (contributor_id = auth.uid());

-- Contributors can delete their own pending contributions
CREATE POLICY "Contributors can delete own pending contributions"
  ON public.contributions FOR DELETE
  TO authenticated
  USING (contributor_id = auth.uid() AND status = 'pending');

-- Admins can view all contributions
CREATE POLICY "Admins can view all contributions"
  ON public.contributions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all contributions (approve/reject)
CREATE POLICY "Admins can update all contributions"
  ON public.contributions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
