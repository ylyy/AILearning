-- 学习监督系统种子数据

-- 插入一些示例学习科目的预设数据
-- 这些数据可以帮助AI更好地识别学习内容

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public) 
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- 设置存储桶策略
CREATE POLICY "Users can upload their own screenshots" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own screenshots" ON storage.objects
FOR SELECT USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own screenshots" ON storage.objects
FOR UPDATE USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own screenshots" ON storage.objects
FOR DELETE USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 创建一些示例成就模板
CREATE TABLE IF NOT EXISTS achievement_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('learning_time', 'productivity', 'consistency', 'subject_mastery')),
    criteria JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入成就模板
INSERT INTO achievement_templates (title, description, icon, type, criteria) VALUES
('学习新手', '完成第一次学习记录', '🎯', 'learning_time', '{"learning_minutes": 15}'),
('学习达人', '单日学习时间达到2小时', '📚', 'learning_time', '{"daily_learning_hours": 2}'),
('学习专家', '单日学习时间达到4小时', '🎓', 'learning_time', '{"daily_learning_hours": 4}'),
('学习大师', '单日学习时间达到6小时', '👨‍🎓', 'learning_time', '{"daily_learning_hours": 6}'),
('高效学习者', '平均生产力达到8分', '⚡', 'productivity', '{"average_productivity": 8}'),
('超级高效', '平均生产力达到9分', '🚀', 'productivity', '{"average_productivity": 9}'),
('学习坚持者', '连续学习3天', '💪', 'consistency', '{"learning_streak_days": 3}'),
('学习毅力王', '连续学习7天', '🏆', 'consistency', '{"learning_streak_days": 7}'),
('学习马拉松', '连续学习30天', '🥇', 'consistency', '{"learning_streak_days": 30}'),
('编程入门', '编程学习时间达到10小时', '💻', 'subject_mastery', '{"subject": "编程开发", "total_hours": 10}'),
('编程进阶', '编程学习时间达到50小时', '🖥️', 'subject_mastery', '{"subject": "编程开发", "total_hours": 50}'),
('编程专家', '编程学习时间达到100小时', '👨‍💻', 'subject_mastery', '{"subject": "编程开发", "total_hours": 100}');

-- 创建学习提醒模板
CREATE TABLE IF NOT EXISTS reminder_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('break', 'goal', 'motivation', 'achievement')),
    trigger_condition JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入提醒模板
INSERT INTO reminder_templates (title, message, type, trigger_condition) VALUES
('休息提醒', '您已经连续工作了1小时，建议休息一下，保护眼睛健康！', 'break', '{"continuous_work_minutes": 60}'),
('学习目标提醒', '今天的学习目标还差一点就完成了，加油！', 'goal', '{"goal_progress_percentage": 80}'),
('学习鼓励', '坚持学习是一个好习惯，继续保持！', 'motivation', '{"learning_streak_days": 1}'),
('效率提醒', '您今天的学习效率很高，继续保持这个状态！', 'motivation', '{"productivity_score": 8}'),
('专注提醒', '检测到您可能分心了，建议回到学习状态。', 'break', '{"non_learning_minutes": 30}'),
('成就解锁', '恭喜您解锁新成就：{achievement_title}！', 'achievement', '{"achievement_unlocked": true}');

-- 创建常见学习网站和应用的识别规则
CREATE TABLE IF NOT EXISTS learning_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    keywords TEXT[] NOT NULL,
    url_patterns TEXT[],
    window_title_patterns TEXT[],
    confidence_boost DECIMAL(3,2) DEFAULT 0.1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入学习模式识别规则
INSERT INTO learning_patterns (name, category, keywords, url_patterns, window_title_patterns, confidence_boost) VALUES
('编程学习', '编程开发', ARRAY['code', 'programming', 'coding', 'developer', 'github', 'stackoverflow', 'leetcode'], 
 ARRAY['github.com', 'stackoverflow.com', 'leetcode.com', 'codepen.io', 'repl.it'], 
 ARRAY['Visual Studio Code', 'IntelliJ IDEA', 'PyCharm', 'Sublime Text', 'Atom'], 0.2),

('在线课程', '在线学习', ARRAY['course', 'lesson', 'tutorial', 'learning', 'education'], 
 ARRAY['coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org', 'bilibili.com'], 
 ARRAY['Coursera', 'Udemy', 'Khan Academy'], 0.3),

('技术文档', '技术学习', ARRAY['documentation', 'docs', 'api', 'reference', 'guide'], 
 ARRAY['developer.mozilla.org', 'docs.python.org', 'reactjs.org', 'nodejs.org'], 
 ARRAY['Documentation', 'API Reference'], 0.2),

('数学学习', '数学', ARRAY['math', 'mathematics', 'calculus', 'algebra', 'geometry'], 
 ARRAY['wolframalpha.com', 'khanacademy.org/math'], 
 ARRAY['Wolfram Alpha', 'GeoGebra'], 0.2),

('语言学习', '语言学习', ARRAY['language', 'english', 'chinese', 'japanese', 'spanish'], 
 ARRAY['duolingo.com', 'babbel.com', 'rosettastone.com'], 
 ARRAY['Duolingo', 'Babbel'], 0.3),

('阅读学习', '阅读', ARRAY['book', 'reading', 'article', 'paper', 'research'], 
 ARRAY['arxiv.org', 'scholar.google.com', 'jstor.org'], 
 ARRAY['PDF', 'Adobe Reader', 'Kindle'], 0.1);

-- 创建娱乐活动识别规则
INSERT INTO learning_patterns (name, category, keywords, url_patterns, window_title_patterns, confidence_boost) VALUES
('视频娱乐', '娱乐', ARRAY['youtube', 'netflix', 'video', 'movie', 'tv show'], 
 ARRAY['youtube.com/watch', 'netflix.com', 'hulu.com', 'twitch.tv'], 
 ARRAY['YouTube', 'Netflix', 'Twitch'], -0.3),

('社交媒体', '社交', ARRAY['facebook', 'twitter', 'instagram', 'social', 'chat'], 
 ARRAY['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com'], 
 ARRAY['Facebook', 'Twitter', 'Instagram', 'WeChat'], -0.2),

('游戏娱乐', '娱乐', ARRAY['game', 'gaming', 'play', 'steam'], 
 ARRAY['steam.com', 'epicgames.com'], 
 ARRAY['Steam', 'Epic Games', 'Game'], -0.4),

('购物网站', '其他', ARRAY['shop', 'buy', 'purchase', 'cart', 'amazon'], 
 ARRAY['amazon.com', 'ebay.com', 'taobao.com', 'jd.com'], 
 ARRAY['Amazon', 'eBay', 'Taobao'], -0.1);

-- 创建函数来自动检查和授予成就
CREATE OR REPLACE FUNCTION check_and_grant_achievements()
RETURNS TRIGGER AS $$
DECLARE
    user_record RECORD;
    template_record RECORD;
    learning_time_today INTEGER;
    learning_streak INTEGER;
    avg_productivity DECIMAL;
BEGIN
    -- 获取用户ID（从截图表或分析表）
    IF TG_TABLE_NAME = 'screenshots' THEN
        SELECT user_id INTO user_record FROM screenshots WHERE id = NEW.id;
    ELSIF TG_TABLE_NAME = 'activity_analysis' THEN
        SELECT s.user_id INTO user_record 
        FROM screenshots s 
        WHERE s.id = NEW.screenshot_id;
    END IF;

    -- 检查各种成就条件
    FOR template_record IN SELECT * FROM achievement_templates LOOP
        -- 检查学习时间成就
        IF template_record.type = 'learning_time' THEN
            -- 计算今日学习时间
            SELECT COUNT(*) * 15 INTO learning_time_today
            FROM activity_analysis aa
            JOIN screenshots s ON aa.screenshot_id = s.id
            WHERE s.user_id = user_record.user_id
            AND aa.activity_type = 'learning'
            AND DATE(s.captured_at) = CURRENT_DATE;

            -- 检查是否达到成就条件
            IF (template_record.criteria->>'daily_learning_hours')::INTEGER * 60 <= learning_time_today THEN
                -- 授予成就（如果还没有）
                INSERT INTO achievements (user_id, title, description, icon, type)
                SELECT user_record.user_id, template_record.title, template_record.description, 
                       template_record.icon, template_record.type
                WHERE NOT EXISTS (
                    SELECT 1 FROM achievements 
                    WHERE user_id = user_record.user_id 
                    AND title = template_record.title
                );
            END IF;
        END IF;

        -- 检查生产力成就
        IF template_record.type = 'productivity' THEN
            SELECT AVG(productivity_score) INTO avg_productivity
            FROM activity_analysis aa
            JOIN screenshots s ON aa.screenshot_id = s.id
            WHERE s.user_id = user_record.user_id
            AND DATE(s.captured_at) = CURRENT_DATE;

            IF avg_productivity >= (template_record.criteria->>'average_productivity')::DECIMAL THEN
                INSERT INTO achievements (user_id, title, description, icon, type)
                SELECT user_record.user_id, template_record.title, template_record.description, 
                       template_record.icon, template_record.type
                WHERE NOT EXISTS (
                    SELECT 1 FROM achievements 
                    WHERE user_id = user_record.user_id 
                    AND title = template_record.title
                );
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER achievement_check_trigger
    AFTER INSERT ON activity_analysis
    FOR EACH ROW
    EXECUTE FUNCTION check_and_grant_achievements();
