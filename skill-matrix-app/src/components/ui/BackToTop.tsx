import { useEffect, useState } from 'react';
import { ArrowUpCircle } from 'lucide-react';

export const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled up to given distance
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Set the top cordinate to 0
  // make scrolling smooth
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <>
      {isVisible && 
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className={`
            fixed bottom-8 right-8 p-2
            bg-primary text-white
            rounded-full shadow-lg
            transition-all duration-300 ease-in-out
            hover:bg-primary/90 hover:scale-110
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            z-50
          `}
        >
          <ArrowUpCircle className="w-6 h-6" />
        </button>
      }
    </>
  );
};

export default BackToTop; 