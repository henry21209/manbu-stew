import TopNav from '@/components/TopNav';
import Hero from '@/components/Hero';
import ProductGrid from '@/components/ProductGrid';
import BrandStory from '@/components/BrandStory';
import Newsletter from '@/components/Newsletter';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <TopNav />
      <main>
        <Hero />
        <ProductGrid />
        <BrandStory />
        <Newsletter />
      </main>
      <Footer />
    </>
  );
}
