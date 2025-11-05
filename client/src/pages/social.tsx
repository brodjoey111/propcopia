import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MessageCircle, Share2, TrendingUp, Users, Send, Sparkles, Loader2, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import stockImage1 from '@assets/stock_images/stock_market_trading_ddaa40ef.jpg';
import stockImage2 from '@assets/stock_images/stock_market_trading_a64dff59.jpg';
import stockImage3 from '@assets/stock_images/stock_market_trading_8fe8b11a.jpg';

interface Post {
  id: string;
  author: {
    name: string;
    username: string;
    avatar?: string;
    isVerified: boolean;
  };
  content: string;
  imageUrl?: string;
  timestamp: Date;
  likes: number;
  comments: number;
  isLiked: boolean;
  performance?: {
    return: number;
    period: string;
  };
}

const stockImages = [stockImage1, stockImage2, stockImage3];

const getKeywordsFromContent = (content: string): string[] => {
  const tradingKeywords = ['ES', 'NQ', 'SPX', 'trading', 'market', 'position', 'futures', 'stock', 'chart', 'strategy', 'trade', 'volatility'];
  const words = content.toLowerCase().split(/\s+/);
  return tradingKeywords.filter(keyword => 
    words.some(word => word.includes(keyword.toLowerCase()))
  );
};

const shouldAutoGenerateImage = (content: string): boolean => {
  const keywords = getKeywordsFromContent(content);
  return keywords.length > 0;
};

export default function Social() {
  const { toast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1,
        };
      }
      return post;
    }));
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    setIsGeneratingImage(true);

    const willGenerateImage = shouldAutoGenerateImage(newPost);
    let imageUrl: string | undefined;

    if (willGenerateImage) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const randomImage = stockImages[Math.floor(Math.random() * stockImages.length)];
      imageUrl = randomImage;

      toast({
        title: "Image auto-generated!",
        description: "We found a relevant image for your trading post.",
      });
    }

    const post: Post = {
      id: `${posts.length + 1}`,
      author: {
        name: 'You',
        username: '@yourusername',
        isVerified: false,
      },
      content: newPost,
      imageUrl,
      timestamp: new Date(),
      likes: 0,
      comments: 0,
      isLiked: false,
    };

    setPosts([post, ...posts]);
    setNewPost('');
    setIsGeneratingImage(false);
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Social</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect with traders, share insights, and learn from the community
        </p>
      </div>

      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="feed" data-testid="tab-feed">
            Feed
          </TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
            <Trophy className="mr-2 h-4 w-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="trending" data-testid="tab-trending">
            <TrendingUp className="mr-2 h-4 w-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="following" data-testid="tab-following">
            <Users className="mr-2 h-4 w-4" />
            Following
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          {/* Create Post */}
          <Card className="p-4">
            <div className="flex gap-3">
              <Avatar data-testid="avatar-current-user">
                <AvatarFallback>Y</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Share your trading insights..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="min-h-[100px] resize-none"
                  data-testid="input-new-post"
                />
                {shouldAutoGenerateImage(newPost) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Auto-generating image for your post...</span>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={handleCreatePost}
                    disabled={!newPost.trim() || isGeneratingImage}
                    data-testid="button-post"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Post
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="p-4" data-testid={`post-${post.id}`}>
                <div className="flex gap-3">
                  <Avatar data-testid={`avatar-${post.id}`}>
                    {post.author.avatar && <AvatarImage src={post.author.avatar} />}
                    <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold" data-testid={`author-name-${post.id}`}>
                          {post.author.name}
                        </span>
                        {post.author.isVerified && (
                          <Badge variant="default" className="text-xs" data-testid={`badge-verified-${post.id}`}>
                            Verified
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {post.author.username}
                        </span>
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground" data-testid={`timestamp-${post.id}`}>
                          {formatTimeAgo(post.timestamp)}
                        </span>
                      </div>
                      
                      {post.performance && (
                        <div className="mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${post.performance.return >= 0 ? 'text-chart-2' : 'text-destructive'}`}
                            data-testid={`performance-${post.id}`}
                          >
                            {post.performance.return >= 0 ? '+' : ''}{post.performance.return}% {post.performance.period}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <p className="text-sm whitespace-pre-wrap" data-testid={`content-${post.id}`}>
                      {post.content}
                    </p>

                    {post.imageUrl && (
                      <div className="relative rounded-lg overflow-hidden border" data-testid={`image-${post.id}`}>
                        <img
                          src={post.imageUrl}
                          alt="Post image"
                          className="w-full h-auto max-h-96 object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Sparkles className="h-3 w-3" />
                            Auto-generated
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-6 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 ${post.isLiked ? 'text-red-500' : ''}`}
                        onClick={() => handleLike(post.id)}
                        data-testid={`button-like-${post.id}`}
                      >
                        <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                        <span data-testid={`likes-count-${post.id}`}>{post.likes}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        data-testid={`button-comment-${post.id}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span data-testid={`comments-count-${post.id}`}>{post.comments}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        data-testid={`button-share-${post.id}`}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <LiveLeaderboard />
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Traders This Week</h3>
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No trending traders yet. Be the first to share your trades!</p>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="following" className="space-y-4">
          <Card className="p-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-2">No Following Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Follow traders to see their posts and insights in your feed
            </p>
            <Button data-testid="button-discover-traders">Discover Traders</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
