import { getAllPosts, getAllTags, getFeaturedPost } from "@/lib/blog/posts";
import { BlogIndexView } from "@/components/blog/blog-index-view";

export const revalidate = 3600; // Edge ISR 1 hour

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const allTags = getAllTags();
  const featuredPost = getFeaturedPost();

  return (
    <BlogIndexView
      initialPosts={posts}
      allTags={allTags}
      featuredPost={featuredPost}
    />
  );
}
