
CREATE TABLE public.news_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.news_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read comments on published articles
CREATE POLICY "Comments are viewable by everyone"
ON public.news_comments FOR SELECT
USING (true);

-- Authenticated users can insert their own comments
CREATE POLICY "Users can insert own comments"
ON public.news_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.news_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can delete any comment
CREATE POLICY "Admins can delete any comment"
ON public.news_comments FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_comments;
