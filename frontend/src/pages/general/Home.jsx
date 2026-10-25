import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Home.css';

const API_URL = 'http://localhost:3000/api/food';
const ACCOUNT_API_URL = 'http://localhost:3000/api/account';

function ReelIcon({ name }) {
  const paths = {
    heart: <path d="M20.8 8.7c0 5.5-8.8 10-8.8 10s-8.8-4.5-8.8-10A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z" />,
    comment: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2 1.5-4A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
    share: <><path d="m21 3-7.2 18-3.8-7-7-3.8L21 3Z" /><path d="M10 14 21 3" /></>,
    more: <><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>,
    cart: <><path d="M3 4h2l2.2 11h10.9l2.2-8H6" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    soundOn: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" /></>,
    soundOff: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="m17 9 5 6m0-6-5 6" /></>,
    play: <path d="m8 5 12 7-12 7V5Z" />,
    pause: <path d="M7 5h4v14H7zm7 0h4v14h-4z" />,
    spoon: <><path d="M7 3a3 3 0 1 0 0 6V21" /><path d="M17 3v6m-3-6v6m6-6v6a3 3 0 0 1-3 3v9" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };

  return (
     <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function FoodReel({ food, foodItems, index, total, isActive, isSaved, onToggleSaved }) {
  const videoRef = useRef(null);
  const controlsHideTimerRef = useRef(null);

  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [areCenterControlsVisible, setAreCenterControlsVisible] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const partner = food.foodPartner;

  const partnerId = partner?._id || partner?.id || partner;
  const partnerFoodItems = !partnerId || typeof partnerId === 'object'
    ? [food]
    : foodItems.filter((item) => {
      const itemPartner = item.foodPartner;
      const itemPartnerId = itemPartner?._id || itemPartner?.id || itemPartner;
      return itemPartnerId && String(itemPartnerId) === String(partnerId);
    });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isActive || hasVideoError) {
      video.pause();
      return;
    }

    let isCancelled = false;
    let playRequested = false;

    const playVideo = async () => {
      if (isCancelled || playRequested || video.error || !video.paused) return;

      playRequested = true;
      try {
        await video.play();
      } catch (error) {
        playRequested = false;
        if (isCancelled) return;
        if (error.name !== 'NotAllowedError') {
          console.error('Video autoplay failed:', error);
        }
      }
    };

    video.muted = true;
    video.defaultMuted = true;
    playVideo();
    video.addEventListener('canplay', playVideo);

    return () => {
      isCancelled = true;
      video.removeEventListener('canplay', playVideo);
    };
  }, [isActive, hasVideoError]);

  useEffect(() => () => {
    window.clearTimeout(controlsHideTimerRef.current);
  }, []);

  const handleVideoPlay = () => {
    setIsPlaying(true);
    setAreCenterControlsVisible(true);
    window.clearTimeout(controlsHideTimerRef.current);
    controlsHideTimerRef.current = window.setTimeout(() => {
      setAreCenterControlsVisible(false);
    }, 900);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    setAreCenterControlsVisible(true);
    window.clearTimeout(controlsHideTimerRef.current);
  };

  // Play/Pause button
  const togglePlayback = () => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      video.play().catch((error) => {
        console.warn('Could not play video:', error.message);
      });
    } else {
      video.pause();
    }
  };

  // Mute/Unmute button
  const toggleMute = () => {
    const nextMuted = !isMuted;

    setIsMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const partnerName = partner?.businessName || 'Local food partner';
  const partnerInitial = partnerName.trim().charAt(0).toUpperCase();
  const tags = food.tags || food.category?.split(',').map((tag) => tag.trim()).filter(Boolean) || [];

  return (
    <article className="food-reel" data-index={index}>
      <video
        ref={videoRef}
        className="food-reel__video"
        src={food.video}
        poster={food.thumbnail || undefined}
        muted={isMuted || !isActive}
        autoPlay={isActive}
        loop
        playsInline
        preload={isActive ? 'auto' : 'metadata'}
        onClick={togglePlayback}
        onLoadedData={() => setHasVideoError(false)}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        onError={() => {
          setHasVideoError(true);
          setIsPlaying(false);
          setAreCenterControlsVisible(true);
          window.clearTimeout(controlsHideTimerRef.current);
        }}
      />
      <div className="food-reel__shade" />

      {hasVideoError && (
        <div className="food-reel__error">
          Video unavailable. Please check the video URL.
        </div>
      )}

      <header className="reels-header">
        <Link to="/" className="reels-brand" aria-label="Insta-Zomato home">
          <span className="reels-brand__mark"><ReelIcon name="spoon" /></span>
          <span>Insta-<strong>Zomato</strong></span>
        </Link>
        <div className="reels-header__label">
          Discover <span>· {index + 1}/{total}</span>
        </div>
        <Link className="reels-profile-link" to="/account" aria-label="Open your profile">
          <ReelIcon name="profile" />
        </Link>
      </header>

      <div
        className={`food-reel__center-controls${areCenterControlsVisible || !isPlaying ? ' is-visible' : ''}`}
        aria-hidden={!areCenterControlsVisible && isPlaying}
      >
        <button
          type="button"
          className="food-reel__icon-button"
          onClick={toggleMute}
          aria-label={isMuted ? 'Turn sound on' : 'Turn sound off'}
          tabIndex={areCenterControlsVisible || !isPlaying ? 0 : -1}
        >
          <ReelIcon name={isMuted ? 'soundOff' : 'soundOn'} />
        </button>
        <button
          type="button"
          className="food-reel__icon-button food-reel__play-button"
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          tabIndex={areCenterControlsVisible || !isPlaying ? 0 : -1}
        >
          <ReelIcon name={isPlaying ? 'pause' : 'play'} />
        </button>
      </div>

      <aside className="food-reel__social" aria-label="Video actions">
        <button
          type="button"
          className={isSaved ? 'is-liked' : ''}
          onClick={() => onToggleSaved(food)}
          aria-label={isSaved ? 'Remove from saved items' : 'Save this food item'}
          aria-pressed={isSaved}
        >
          <ReelIcon name="heart" />
          <span>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        <button
          type="button"
          onClick={() => document.getElementById(`food-description-${index}`)?.scrollIntoView({ block: 'nearest' })}
          aria-label="View food description"
        >
          <ReelIcon name="comment" />
          <span>Details</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: food.name || partnerName, url: window.location.href })
                .catch((error) => {
                  if (error.name !== 'AbortError') console.error('Could not share food video:', error);
                });
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(window.location.href)
                .catch((error) => console.error('Could not copy video link:', error));
            }
          }}
          aria-label="Share food video"
        >
          <ReelIcon name="share" />
          <span>Share</span>
        </button>
      </aside>

      <div className="food-reel__content">
        <div className="food-reel__details">
          <Link
            className="food-reel__order"
            to={partnerId ? `/food-partner/profile/${encodeURIComponent(String(partnerId))}` : '/food-partner/profile'}
            state={{
              partner: typeof partner === 'object' ? partner : {},
              foodItems: partnerFoodItems,
              checkoutFoodId: food._id,
            }}
          >
            <ReelIcon name="cart" />
            <span>Order now</span>
            <ReelIcon name="arrow" />
          </Link>

          <div className="food-reel__partner-row">
            <Link
              className="food-reel__partner-store-link"
              to={partnerId ? `/food-partner/profile/${encodeURIComponent(String(partnerId))}` : '/food-partner/profile'}
              state={{ partner: typeof partner === 'object' ? partner : {}, foodItems: partnerFoodItems }}
              aria-label={`Open ${partnerName} store`}
            >
              <div className="food-reel__partner-avatar">
                {partner?.profileImage || partner?.logo ? <img src={partner.profileImage || partner.logo} alt="" /> : <span>{partnerInitial}</span>}
              </div>
              <div className="food-reel__partner-copy">
                <p className="food-reel__partner">{partnerName}</p>
                <span>{partner?.address || 'Food partner'}</span>
              </div>
            </Link>
            <button
              type="button"
              className={`food-reel__follow${isFollowing ? ' is-following' : ''}`}
              onClick={() => setIsFollowing((following) => !following)}
              aria-pressed={isFollowing}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>

          <div className="food-reel__food-info" id={`food-description-${index}`}>
            <div className="food-reel__title-row">
              <h2 className="food-reel__title">{food.name || 'Delicious food'}</h2>
              <button type="button" className="food-reel__more" aria-label="More video options">
                <ReelIcon name="more" />
              </button>
            </div>
            {food.description && (
              <p className="food-reel__description">{food.description}</p>
            )}
            {tags.length > 0 && (
              <div className="food-reel__tags">
                {tags.slice(0, 3).map((tag) => (
                  <span key={tag}>#{tag.replace(/^#/, '').replace(/\s+/g, '')}</span>
                ))}
              </div>
            )}
            <p className="food-reel__audio">
              <span>♫</span> Original audio · {partnerName}
            </p>
          </div>
        </div>

        <span className="food-reel__hint">Scroll to explore</span>
      </div>
    </article>
  );
}

function Home() {
  const [foodItems, setFoodItems] = useState([]);
  const [savedFoodIds, setSavedFoodIds] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState('loading');

  const feedRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    axios.get(ACCOUNT_API_URL, { withCredentials: true })
      .then((response) => {
        if (isMounted) {
          setSavedFoodIds((response.data.savedFoods || []).map((food) => food._id));
        }
      })
      .catch((error) => {
        if (error.response?.status !== 401) {
          console.error('Could not load saved food items:', error);
        }
      });

    return () => { isMounted = false; };
  }, []);

  const toggleSavedFood = async (food) => {
    if (!food._id) {
      toast.error('This item cannot be saved because it has no food ID.');
      return;
    }

    const isSaved = savedFoodIds.includes(food._id);
    try {
      if (isSaved) {
        await axios.delete(`${ACCOUNT_API_URL}/saved/${food._id}`, { withCredentials: true });
        setSavedFoodIds((current) => current.filter((id) => id !== food._id));
        toast.success('Removed from saved items.');
      } else {
        await axios.post(`${ACCOUNT_API_URL}/saved/${food._id}`, {}, { withCredentials: true });
        setSavedFoodIds((current) => current.includes(food._id) ? current : [...current, food._id]);
        toast.success('Added to saved items.');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.info('Sign in to save food items.');
        navigate('/user/login');
        return;
      }
      toast.error(error.response?.data?.message || 'Could not update saved items.');
    }
  };

  // Fetch videos from backend
  useEffect(() => {
    const controller = new AbortController();

    async function loadFoodItems() {
      try {
        setStatus('loading');

        const response = await axios.get(API_URL, {
          withCredentials: true,
          signal: controller.signal,
        });

        const data = response.data;

        // Supports common API response formats
        const items = Array.isArray(data)
          ? data
          : data?.foodItems ??
            data?.foods ??
            data?.data ??
            [];

        if (!Array.isArray(items)) {
          throw new Error('Invalid food API response.');
        }

        const playableItems = items.filter(
          (food) =>
            food &&
            typeof food.video === 'string' &&
            food.video.trim() !== ''
        );

        console.log('Food items received:', items.length);
        console.log('Playable videos:', playableItems.length);

        setFoodItems(playableItems);
        setActiveIndex(0);
        setStatus('loaded');

      } catch (error) {
        if (error.code === 'ERR_CANCELED') return;

        console.error('Failed to load food videos:', error);

        setStatus(
          error.response?.status === 401
            ? 'unauthenticated'
            : 'error'
        );
      }
    }

    loadFoodItems();

    return () => {
      controller.abort();
    };
  }, []);

  // Detect the most visible video
  useEffect(() => {
    const feed = feedRef.current;

    if (!feed || foodItems.length === 0) return;

    const reels = feed.querySelectorAll('.food-reel');

    const ratios = new Map();

    const updateActiveReel = () => {
      let bestIndex = 0;
      let bestRatio = -1;

      reels.forEach((reel, index) => {
        const rect = reel.getBoundingClientRect();
        const feedRect = feed.getBoundingClientRect();

        const visibleTop = Math.max(rect.top, feedRect.top);
        const visibleBottom = Math.min(rect.bottom, feedRect.bottom);

        const visibleHeight = Math.max(
          0,
          visibleBottom - visibleTop
        );

        const ratio = rect.height > 0
          ? visibleHeight / rect.height
          : 0;

        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestIndex = index;
        }
      });

      setActiveIndex((current) =>
        current === bestIndex ? current : bestIndex
      );
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              ratios.set(
                entry.target,
                entry.intersectionRatio
              );
            } else {
              ratios.delete(entry.target);
            }
          });

          const mostVisible = [...ratios.entries()].sort(
            (a, b) => b[1] - a[1]
          )[0];

          if (mostVisible) {
            const nextIndex = Number(
              mostVisible[0].dataset.index
            );

            setActiveIndex((current) =>
              current === nextIndex ? current : nextIndex
            );
          }
        },
        {
          root: feed,
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }
      );

      reels.forEach((reel) => observer.observe(reel));

      return () => observer.disconnect();
    }

    feed.addEventListener('scroll', updateActiveReel, {
      passive: true,
    });

    updateActiveReel();

    return () => {
      feed.removeEventListener('scroll', updateActiveReel);
    };
  }, [foodItems]);

  // Loading
  if (status === 'loading') {
    return (
      <main className="reels-message">
        <p>Finding something delicious...</p>
      </main>
    );
  }

  // Login required
  if (status === 'unauthenticated') {
    return (
      <main className="reels-message">
        <h1>Discover delicious food</h1>
        <p>Please sign in to explore food videos.</p>

        <Link to="/user/login" className="reels-message__action">
          Sign in
        </Link>
      </main>
    );
  }

  // API error
  if (status === 'error') {
    return (
      <main className="reels-message">
        <h1>Could not load food videos.</h1>
        <p>Check your backend server and food API.</p>

        <button
          className="reels-message__action"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </main>
    );
  }

  // No videos available
  if (foodItems.length === 0) {
    return (
      <main className="reels-message">
        <h1>No food videos yet.</h1>

        <p>
          Add food items with valid video URLs to display them here.
        </p>

        <Link
          to="/food-partner/register"
          className="reels-message__action"
        >
          Become a food partner
        </Link>
      </main>
    );
  }

  // Food video feed
  return (
    <main
      className="reels-feed"
      aria-label="Food video feed"
      ref={feedRef}
      tabIndex={0}
    >
      {foodItems.map((food, index) => (
        <div
          className="reels-feed__item"
          key={food._id || food.video || index}
          data-index={index}
        >
          <FoodReel
            food={food}
            foodItems={foodItems}
            index={index}
            total={foodItems.length}
            isActive={index === activeIndex}
            isSaved={savedFoodIds.includes(food._id)}
            onToggleSaved={toggleSavedFood}
          />
        </div>
      ))}
    </main>
  );
}

export default Home;