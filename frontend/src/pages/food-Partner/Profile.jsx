import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import './Profile.css'

const FOOD_API_URL = 'http://localhost:3000/api/food'
const ACCOUNT_API_URL = 'http://localhost:3000/api/account'

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load the Razorpay checkout.'))
    document.body.appendChild(script)
  })
}

function Icon({ name, className = '' }) {
  const paths = {
    back: <><path d="m14 5-7 7 7 7" /><path d="M7 12h13" /></>,
    heart: <path d="M20.8 8.7c0 5.5-8.8 10-8.8 10s-8.8-4.5-8.8-10A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z" />,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    delivery: <><circle cx="5" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M7 18h8l-2-7H8l-2 7m9 0 2-5h3l1 5m-7-9 2-3h3" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    play: <path d="m9 6 10 6-10 6V6Z" />,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M4 21c3-5 7-8 12-11" /></>,
    chef: <><path d="M6 13v7h12v-7" /><path d="M5 13a4 4 0 1 1 1-7 5 5 0 0 1 10 0 4 4 0 1 1 3 7H5Z" /><path d="M9 17h6" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  )
}

function getPartnerId(partner) {
  if (!partner) return ''
  if (typeof partner === 'string') return partner
  return String(partner._id || partner.id || '')
}

function ReviewWidget({ targetType, targetId, targetName, compact = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [reviewData, setReviewData] = useState({ averageRating: 0, reviewCount: 0, reviews: [] })
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadReviews = useCallback(async () => {
    try {
      setLoadError('')
      const response = await axios.get(`${FOOD_API_URL}/reviews/${targetType}/${encodeURIComponent(targetId)}`)
      setReviewData(response.data)
    } catch (error) {
      console.error('Could not load reviews:', error)
      setLoadError(error.response?.data?.message || 'Could not load reviews.')
    } finally {
      setIsLoading(false)
    }
  }, [targetId, targetType])

  useEffect(() => {
    let isActive = true

    async function fetchReviews() {
      try {
        const response = await axios.get(`${FOOD_API_URL}/reviews/${targetType}/${encodeURIComponent(targetId)}`)
        if (isActive) setReviewData(response.data)
      } catch (error) {
        if (isActive) {
          console.error('Could not load reviews:', error)
          setLoadError(error.response?.data?.message || 'Could not load reviews.')
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    fetchReviews()
    return () => { isActive = false }
  }, [targetId, targetType])

  const submitReview = async (event) => {
    event.preventDefault()
    if (!rating) {
      toast.info('Choose a star rating first.')
      return
    }
    setIsSubmitting(true)
    try {
      await axios.post(`${FOOD_API_URL}/reviews`, {
        targetType,
        targetId,
        rating,
        comment,
      }, { withCredentials: true })
      setComment('')
      setRating(0)
      setIsFormOpen(false)
      toast.success('Your review has been saved.')
      await loadReviews()
    } catch (error) {
      if (error.response?.status === 401) {
        toast.info('Sign in as a user to write a review.')
        navigate('/user/login', { state: { from: location.pathname } })
      } else {
        toast.error(error.response?.data?.message || 'Could not save your review.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`review-widget${compact ? ' review-widget--compact' : ''}`}>
      <div className="review-widget__summary">
        <span className="review-widget__score">
          {reviewData.reviewCount
            ? `★ ${reviewData.averageRating.toFixed(1)}`
            : compact ? '☆ No ratings' : 'No ratings yet'}
        </span>
        {reviewData.reviewCount > 0 && (
          <span className="review-widget__count">
            {reviewData.reviewCount} {reviewData.reviewCount === 1 ? 'review' : 'reviews'}
          </span>
        )}
        <button
          type="button"
          className="review-widget__toggle"
          onClick={() => setIsFormOpen((open) => !open)}
          aria-expanded={isFormOpen}
        >
          {isFormOpen ? 'Cancel' : compact ? 'Rate' : 'Write a review'}
        </button>
      </div>

      {isFormOpen && (
        <form className="review-widget__form" onSubmit={submitReview}>
          <fieldset className="review-widget__rating">
            <legend>Your rating for {targetName}</legend>
            <div role="group" aria-label="Choose a star rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  className={value <= rating ? 'is-selected' : ''}
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                  aria-pressed={rating === value}
                >
                  ★
                </button>
              ))}
            </div>
          </fieldset>
          <label className="review-widget__comment">
            Your review
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              minLength={2}
              maxLength={1000}
              placeholder="Share what you liked about it…"
              required
            />
          </label>
          <button className="review-widget__submit" type="submit" disabled={isSubmitting || !rating}>
            {isSubmitting ? 'Saving…' : 'Submit review'}
          </button>
        </form>
      )}

      {loadError && (
        <div className="review-widget__error">
          <span>{loadError}</span>
          <button type="button" onClick={loadReviews}>Try again</button>
        </div>
      )}
      {!compact && isLoading ? (
        <p className="review-widget__empty">Loading reviews…</p>
      ) : !compact && reviewData.reviews.length ? (
        <ul className="review-widget__list">
          {reviewData.reviews.map((review) => (
            <li className="review-widget__entry" key={review._id}>
              <div className="review-widget__entry-heading">
                <strong>{review.user?.fullname || 'Insta-Zomato user'}</strong>
                <span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
              </div>
              <p>{review.comment}</p>
              <time dateTime={review.updatedAt}>
                {new Date(review.updatedAt).toLocaleDateString()}
              </time>
            </li>
          ))}
        </ul>
      ) : !compact && !loadError ? (
        <p className="review-widget__empty">Be the first to review {targetName}.</p>
      ) : null}
    </div>
  )
}

function Profile() {
  const { partnerId: routePartnerId } = useParams()
  const location = useLocation()
  const { state } = location
  const navigate = useNavigate()
  const hasLocationData = Boolean(state?.partner || Array.isArray(state?.foodItems))
  const [loadedData, setLoadedData] = useState({ partner: null, foodItems: [] })
  const partner = state?.partner || loadedData.partner
  const foodItems = Array.isArray(state?.foodItems) ? state.foodItems : loadedData.foodItems
  const initialCheckoutFood = state?.checkoutFoodId
    ? foodItems.find((food) => String(food._id) === String(state.checkoutFoodId)) || null
    : null
  const [isLoading, setIsLoading] = useState(!hasLocationData && Boolean(routePartnerId))
  const [loadError, setLoadError] = useState(
    !hasLocationData && !routePartnerId ? 'Restaurant details were not provided.' : '',
  )
  const [activeTab, setActiveTab] = useState('Menu')
  const [isFavorite, setIsFavorite] = useState(false)
  const [checkoutFood, setCheckoutFood] = useState(initialCheckoutFood)
  const [checkoutAddresses, setCheckoutAddresses] = useState([])
  const [checkoutAddressId, setCheckoutAddressId] = useState('')
  const [checkoutQuantity, setCheckoutQuantity] = useState(1)
  const [checkoutLoading, setCheckoutLoading] = useState(Boolean(initialCheckoutFood))
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('COD')

  const partnerId = routePartnerId || getPartnerId(partner)

  useEffect(() => {
    if (hasLocationData || !partnerId) return undefined

    const controller = new AbortController()

    async function loadRestaurant() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await axios.get(`${FOOD_API_URL}/partner/${encodeURIComponent(partnerId)}`, {
          signal: controller.signal,
        })
        const items = response.data?.foodItems
        if (!Array.isArray(items)) {
          throw new Error('The restaurant API returned an invalid menu.')
        }

        setLoadedData({
          foodItems: items,
          partner: response.data.partner || null,
        })
      } catch (error) {
        if (error.code === 'ERR_CANCELED') return
        console.error('Could not load restaurant details:', error)
        setLoadError(
          error.response?.data?.message || 'Could not load this restaurant right now.',
        )
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadRestaurant()
    return () => controller.abort()
  }, [hasLocationData, partnerId])

  const businessName = partner?.businessName || 'Restaurant'
  const address = partner?.address || 'Address not provided'
  const avatarInitial = businessName.trim().charAt(0).toUpperCase() || 'R'
  const tabs = ['Menu', 'About', 'Reviews', 'Photos', 'Location']
  const menuCategories = useMemo(
    () => ['All items', ...new Set(foodItems.map((food) => food.category).filter(Boolean))],
    [foodItems],
  )

  const shareStore = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: businessName, url: window.location.href })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href)
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Could not share restaurant:', error)
      }
    }
  }

  const scrollToSection = (tab) => {
    setActiveTab(tab)
    document.getElementById(`profile-${tab.toLowerCase()}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const startOrder = (food) => {
    if (!food.price) {
      toast.info('This food item is not available to order yet.')
      return
    }
    setCheckoutFood(food)
    setCheckoutLoading(true)
    setCheckoutQuantity(1)
    setPaymentMethod('COD')
  }

  useEffect(() => {
    if (!location.state?.checkoutFoodId) return
    navigate(location.pathname, {
      replace: true,
      state: { ...location.state, checkoutFoodId: undefined },
    })
  }, [location.key, location.pathname, location.state, navigate])

  useEffect(() => {
    if (!checkoutFood) return undefined
    let isActive = true

    async function loadCheckoutAddresses() {
      try {
        const response = await axios.get(ACCOUNT_API_URL, { withCredentials: true })
        if (!isActive) return
        const addresses = response.data?.addresses || []
        setCheckoutAddresses(addresses)
        setCheckoutAddressId(addresses.find((address) => address.isDefault)?._id || addresses[0]?._id || '')
      } catch (error) {
        if (!isActive) return
        setCheckoutFood(null)
        if (error.response?.status === 401) {
          navigate('/user/login', { state: { from: location.pathname } })
          toast.info('Sign in to place your order.')
        } else {
          toast.error(error.response?.data?.message || 'Could not load your delivery addresses.')
        }
      } finally {
        if (isActive) setCheckoutLoading(false)
      }
    }

    loadCheckoutAddresses()
    return () => { isActive = false }
  }, [checkoutFood, location.pathname, navigate])

  const submitOrder = async (event) => {
    event.preventDefault()
    if (!checkoutFood || !checkoutAddressId) return
    setOrderSubmitting(true)

    if (paymentMethod === 'COD') {
      try {
        const response = await axios.post(`${ACCOUNT_API_URL}/orders`, {
          foodId: checkoutFood._id,
          addressId: checkoutAddressId,
          quantity: checkoutQuantity,
        }, { withCredentials: true })
        setCheckoutFood(null)
        toast.success('Order placed with Cash on Delivery.')
        navigate(`/account/orders/${response.data.order._id}`)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Could not place this order.')
      } finally {
        setOrderSubmitting(false)
      }
      return
    }

    let localOrderId = ''
    let paymentCompleted = false
    try {
      const response = await axios.post(`${ACCOUNT_API_URL}/orders/online/create`, {
        foodId: checkoutFood._id,
        addressId: checkoutAddressId,
        quantity: checkoutQuantity,
      }, { withCredentials: true })
      localOrderId = response.data.order._id
      const payment = response.data.payment

      await loadRazorpayCheckout()
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: payment.restaurantName,
        description: payment.foodName,
        order_id: payment.gatewayOrderId,
        prefill: {
          name: payment.customerName,
          email: payment.customerEmail,
          contact: payment.customerPhone,
        },
        theme: { color: '#e9434b' },
        handler: async (gatewayResponse) => {
          paymentCompleted = true
          try {
            const verification = await axios.post(`${ACCOUNT_API_URL}/orders/online/verify`, {
              localOrderId,
              ...gatewayResponse,
            }, { withCredentials: true })
            setCheckoutFood(null)
            toast.success(verification.data.message || 'Payment successful. Order placed.')
            navigate(`/account/orders/${localOrderId}`)
          } catch (error) {
            toast.error(error.response?.data?.message || 'Payment was received, but order verification failed. Please contact support.')
          } finally {
            setOrderSubmitting(false)
          }
        },
        modal: {
          ondismiss: async () => {
            if (localOrderId && !paymentCompleted) {
              try {
                await axios.post(`${ACCOUNT_API_URL}/orders/online/cancel`, { localOrderId }, { withCredentials: true })
              } catch (error) {
                console.error('Could not cancel dismissed payment order:', error)
              }
            }
            setOrderSubmitting(false)
          },
        },
      })
      checkout.on('payment.failed', async (gatewayError) => {
        paymentCompleted = true
        if (localOrderId) {
          try {
            await axios.post(`${ACCOUNT_API_URL}/orders/online/cancel`, { localOrderId }, { withCredentials: true })
          } catch (error) {
            console.error('Could not cancel failed payment order:', error)
          }
        }
        toast.error(gatewayError.error?.description || 'Payment failed. Please try again.')
        setOrderSubmitting(false)
      })
      checkout.open()
    } catch (error) {
      if (localOrderId && !paymentCompleted) {
        try {
          await axios.post(`${ACCOUNT_API_URL}/orders/online/cancel`, { localOrderId }, { withCredentials: true })
        } catch (cancelError) {
          console.error('Could not cancel unstarted payment order:', cancelError)
        }
      }
      toast.error(error.response?.data?.message || 'Could not place this order.')
      setOrderSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="restaurant-profile-page restaurant-profile-page--message">
        <p>Loading restaurant…</p>
      </main>
    )
  }

  if (loadError && !partner && foodItems.length === 0) {
    return (
      <main className="restaurant-profile-page restaurant-profile-page--message">
        <p>{loadError}</p>
        {loadError.startsWith('Please sign in') && (
          <Link className="restaurant-profile__button restaurant-profile__button--primary" to="/user/login">
            Sign in
          </Link>
        )}
      </main>
    )
  }

  return (
    <main className="restaurant-profile-page">
      <article className="restaurant-profile">
        <section className="restaurant-profile__hero" aria-label={`${businessName} restaurant`}>
          {partner?.backgroundImage ? (
            <img
              className="restaurant-profile__hero-media"
              src={partner.backgroundImage}
              alt={`${businessName} restaurant cover`}
            />
          ) : (
            <div className="restaurant-profile__hero-placeholder">
              <span>{avatarInitial}</span>
            </div>
          )}
          <div className="restaurant-profile__hero-shade" />
          <div className="restaurant-profile__hero-actions">
            <button type="button" onClick={() => navigate(-1)} aria-label="Go back">
              <Icon name="back" />
            </button>
            <div>
              <button
                type="button"
                className={isFavorite ? 'is-favorite' : ''}
                onClick={() => setIsFavorite((favorite) => !favorite)}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-pressed={isFavorite}
              >
                <Icon name="heart" />
              </button>
              <button type="button" onClick={shareStore} aria-label="Share restaurant">
                <Icon name="share" />
              </button>
            </div>
          </div>
          <div className="restaurant-profile__identity">
            <div className="restaurant-profile__logo">
              {partner?.profileImage ? <img src={partner.profileImage} alt={`${businessName} profile`} /> : <span>{avatarInitial}</span>}
            </div>
            <div className="restaurant-profile__identity-copy">
              <p className="restaurant-profile__eyebrow">Restaurant</p>
              <h1>{businessName}</h1>
              <p className="restaurant-profile__address">{address}</p>
              <p className="restaurant-profile__food-types">
                {partner?.cuisineType || `${foodItems.length} ${foodItems.length === 1 ? 'menu item' : 'menu items'} · Food partner`}
              </p>
            </div>
          </div>
        </section>

        <div className="restaurant-profile__body">
          <section className="restaurant-profile__service" aria-label="Restaurant information">
            <div>
              <Icon name="delivery" />
              <span><strong>Menu videos</strong><small>{foodItems.length} listed</small></span>
            </div>
            <div>
              <Icon name="clock" />
              <span><strong>Store details</strong><small>{partner?.openingHours || 'From food partner'}</small></span>
            </div>
            <div>
              <Icon name="shield" />
              <span><strong>Food partner</strong><small>On Insta-Zomato</small></span>
            </div>
          </section>

          <div className="restaurant-profile__actions">
            <button
              type="button"
              className="restaurant-profile__button restaurant-profile__button--primary"
              onClick={() => scrollToSection('Menu')}
            >
              Browse menu <Icon name="arrow" />
            </button>
            <a
              className="restaurant-profile__button restaurant-profile__button--secondary"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="pin" /> Directions
            </a>
          </div>

          <nav className="restaurant-profile__tabs" aria-label="Restaurant sections">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab}
                className={activeTab === tab ? 'is-active' : ''}
                onClick={() => scrollToSection(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>

          <section className="restaurant-profile__section" id="profile-menu">
            <div className="restaurant-profile__section-heading">
              <div>
                <p className="restaurant-profile__eyebrow">Fresh from the kitchen</p>
                <h2>Menu</h2>
              </div>
              <span className="restaurant-profile__count">{foodItems.length} items</span>
            </div>
            {menuCategories.length > 1 && (
              <div className="restaurant-profile__categories">
                {menuCategories.map((category, index) => (
                  <span className={index === 0 ? 'is-selected' : ''} key={category}>
                    {category}
                  </span>
                ))}
              </div>
            )}
            {foodItems.length ? (
              <div className="restaurant-profile__menu-grid">
                {foodItems.map((food, index) => (
                  <article className="restaurant-menu-card" key={food._id || food.video || index}>
                    <div className="restaurant-menu-card__media">
                      {food.thumbnail ? (
                        <img src={food.thumbnail} alt={food.name || 'Food'} loading="lazy" />
                      ) : food.video ? (
                        <video src={food.video} muted playsInline preload="metadata" />
                      ) : (
                        <div className="restaurant-menu-card__placeholder">{avatarInitial}</div>
                      )}
                      {food.video && <span className="restaurant-menu-card__play"><Icon name="play" /></span>}
                    </div>
                    <div className="restaurant-menu-card__details">
                      <h3>{food.name || 'Menu item'}</h3>
                      {food.description && <p>{food.description}</p>}
                      <div className="restaurant-menu-card__meta">
                        <strong>{food.price ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(food.price) : 'Price unavailable'}</strong>
                        {food.rating && <span>★ {Number(food.rating).toFixed(1)} <small>Partner rating</small></span>}
                      </div>
                      <button
                        className="restaurant-menu-card__order"
                        type="button"
                        disabled={!food.price}
                        onClick={() => startOrder(food)}
                      >
                        Order now <Icon name="arrow" />
                      </button>
                      {food._id && (
                        <ReviewWidget
                          targetType="Food"
                          targetId={food._id}
                          targetName={food.name || 'this food item'}
                          compact
                        />
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="restaurant-profile__empty">
                <span className="restaurant-profile__empty-icon"><Icon name="chef" /></span>
                <h3>Menu coming soon</h3>
                <p>This restaurant has not added food videos yet.</p>
              </div>
            )}
          </section>

          <section className="restaurant-profile__section" id="profile-about">
            <div className="restaurant-profile__section-heading">
              <h2>About this store</h2>
            </div>
            <div className="restaurant-profile__about-card">
              <p>
                {partner?.description ||
                  `${businessName} is a food partner on Insta-Zomato. Explore the menu videos above to discover what is available.`}
              </p>
              <div className="restaurant-profile__qualities">
                <span><Icon name="leaf" /> {partner?.cuisineType || 'Food partner'}</span>
                <span><Icon name="chef" /> Video menu</span>
                <span><Icon name="shield" /> Store profile</span>
              </div>
            </div>
          </section>

          <section className="restaurant-profile__section" id="profile-reviews">
            <div className="restaurant-profile__section-heading">
              <div>
                <p className="restaurant-profile__eyebrow">Feedback from diners</p>
                <h2>Reviews for {businessName}</h2>
              </div>
            </div>
            {partnerId ? (
              <ReviewWidget
                targetType="Partner"
                targetId={partnerId}
                targetName={businessName}
              />
            ) : (
              <div className="restaurant-profile__empty restaurant-profile__empty--compact">
                <p>Restaurant details are needed before customers can review this store.</p>
              </div>
            )}
          </section>

          <section className="restaurant-profile__section" id="profile-photos">
            <div className="restaurant-profile__section-heading">
              <h2>Photos & videos</h2>
              <span className="restaurant-profile__count">{foodItems.length}</span>
            </div>
            <div className="restaurant-profile__photo-strip">
              {foodItems.length ? foodItems.map((food, index) => (
                <div className="restaurant-profile__photo" key={food._id || food.video || index}>
                  {food.thumbnail ? (
                    <img src={food.thumbnail} alt={food.name || 'Restaurant food'} loading="lazy" />
                  ) : (
                    <video src={food.video} muted playsInline preload="metadata" />
                  )}
                </div>
              )) : <p>Food photos will appear here when available.</p>}
            </div>
          </section>

          <section className="restaurant-profile__section" id="profile-location">
            <div className="restaurant-profile__section-heading">
              <h2>Location</h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noreferrer"
              >
                Open map <Icon name="arrow" />
              </a>
            </div>
            <div className="restaurant-profile__location-card">
              <span className="restaurant-profile__location-pin"><Icon name="pin" /></span>
              <div>
                <strong>{address}</strong>
                <p>Restaurant address provided by the food partner.</p>
              </div>
              <div className="restaurant-profile__map-preview" aria-hidden="true">
                <Icon name="pin" />
              </div>
            </div>
          </section>
          {loadError && <p className="restaurant-profile__inline-error">{loadError}</p>}
        </div>
      </article>
      {checkoutFood && (
        <div className="restaurant-checkout-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !orderSubmitting) setCheckoutFood(null) }}>
          <section className="restaurant-checkout" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <div className="restaurant-checkout__heading"><div><p className="restaurant-profile__eyebrow">Secure checkout</p><h2 id="checkout-title">Order {checkoutFood.name}</h2></div><button type="button" onClick={() => setCheckoutFood(null)} disabled={orderSubmitting} aria-label="Close">×</button></div>
            {checkoutLoading ? <div className="restaurant-checkout__loading">Loading your saved addresses…</div> : checkoutAddresses.length ? (
              <form onSubmit={submitOrder}>
                <label className="restaurant-checkout__field">Delivery address
                  <select required value={checkoutAddressId} onChange={(event) => setCheckoutAddressId(event.target.value)}>
                    {checkoutAddresses.map((address) => <option value={address._id} key={address._id}>{address.label}: {[address.line1, address.city, address.state, address.postalCode].filter(Boolean).join(', ')}{address.isDefault ? ' (Default)' : ''}</option>)}
                  </select>
                </label>
                <label className="restaurant-checkout__field">Quantity
                  <input type="number" min="1" max="20" value={checkoutQuantity} onChange={(event) => setCheckoutQuantity(Number(event.target.value))} required />
                </label>
                <fieldset className="restaurant-checkout__payments">
                  <legend>Choose payment method</legend>
                  <label>
                    <input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
                    <span><strong>Cash on Delivery</strong><small>Pay when your order arrives</small></span>
                  </label>
                  <label>
                    <input type="radio" name="paymentMethod" value="RAZORPAY" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} />
                    <span><strong>Pay online</strong><small>UPI, cards, net banking and more via Razorpay</small></span>
                  </label>
                </fieldset>
                <div className="restaurant-checkout__total"><span>Order total</span><strong>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(checkoutFood.price * checkoutQuantity)}</strong></div>
                <button className="restaurant-profile__button restaurant-profile__button--primary restaurant-checkout__submit" type="submit" disabled={orderSubmitting || !checkoutAddressId}>{orderSubmitting ? (paymentMethod === 'COD' ? 'Placing order…' : 'Opening secure checkout…') : (paymentMethod === 'COD' ? 'Confirm COD order' : 'Continue to payment')}</button>
              </form>
            ) : (
              <div className="restaurant-checkout__empty"><p>Add a delivery address before placing this order.</p><Link className="restaurant-profile__button restaurant-profile__button--primary" to="/account/addresses">Manage addresses</Link></div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default Profile
