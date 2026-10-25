import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import './UserAccount.css'

const ACCOUNT_API = 'http://localhost:3000/api/account'
const USER_AUTH_API = 'http://localhost:3000/api/auth/user'

function AccountIcon({ name, className = '' }) {
  const icons = {
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.4.8l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.4-.8l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-1.7l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.4-.8l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.4.8l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1 0 1.6Z" /></>,
    saved: <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V22l-6-4-6 4V4.5Z" />,
    orders: <><path d="M4 7h16l-1 14H5L4 7Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /><path d="M9 12h.01M15 12h.01" /></>,
    address: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    payment: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20m-15 5h4" /></>,
    edit: <><path d="m14 5 5 5M4 20l4-.8L19.5 7.7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="m14 5-7 7 7 7" /><path d="M7 12h13" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" /></>,
    help: <><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.7c-1.2 1.2-1.8 1.3-1.8 3.3m0 3h.01" /></>,
    terms: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5m-9 4h5m-5 4h5" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    plus: <><path d="M12 5v14m-7-7h14" /></>,
    trash: <><path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6" /></>,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z" /></>,
    office: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2m-5 6v-3h2v3" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20m-15 5h4" /></>,
    cash: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M7 9H6m12 6h-1" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    crown: <><path d="m2 8 5 4 5-8 5 8 5-4-2 12H4L2 8Z" /><path d="M5 17h14" /></>,
    leaf: <><path d="M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16Z" /><path d="M4 21c3-5 7-8 12-11" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
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
      {icons[name] || icons.profile}
    </svg>
  )
}

function formatPrice(amount) {
  if (typeof amount !== 'number') return 'Price unavailable'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function getFoodImage(food) {
  return food?.thumbnail || food?.image || ''
}

function FoodImage({ food, className = '' }) {
  const image = getFoodImage(food)
  if (image) return <img className={className} src={image} alt={food?.name || 'Food'} loading="lazy" />
  if (food?.video) return <video className={className} src={food.video} muted playsInline preload="metadata" />
  return <div className={`${className} account-food-placeholder`}><AccountIcon name="leaf" /></div>
}

function StatusBadge({ status }) {
  const normalized = status || 'Processing'
  return <span className={`account-status account-status--${normalized.toLowerCase().replace(/\s+/g, '-')}`}>{normalized}</span>
}

function EmptyState({ icon = 'orders', title, detail, action }) {
  return (
    <div className="account-empty">
      <span className="account-empty__icon"><AccountIcon name={icon} /></span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  )
}

function UserAccount() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathnameRef = useRef(location.pathname)
  const pathParts = location.pathname.split('/').filter(Boolean)
  const page = pathParts[1] || 'profile'
  const orderId = page === 'orders' ? pathParts[2] : ''

  const [account, setAccount] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [orderFilter, setOrderFilter] = useState('All')
  const [addressEditor, setAddressEditor] = useState(null)
  const [paymentEditorOpen, setPaymentEditorOpen] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    pathnameRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    let isMounted = true
    async function loadAccount() {
      try {
        const response = await axios.get(ACCOUNT_API, { withCredentials: true })
        if (isMounted) setAccount(response.data)
      } catch (error) {
        if (!isMounted) return
        if (error.response?.status === 401) {
          navigate('/user/login', { replace: true, state: { from: pathnameRef.current } })
          return
        }
        console.error('Could not load account:', error)
        setPageError(error.response?.data?.message || 'Could not load your account. Please try again.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadAccount()
    return () => { isMounted = false }
  }, [navigate])

  useEffect(() => {
    if (page !== 'orders') return undefined
    let isMounted = true
    async function loadOrders() {
      try {
        const response = await axios.get(`${ACCOUNT_API}/orders`, { withCredentials: true })
        if (isMounted) setOrders(response.data.orders || [])
      } catch (error) {
        if (isMounted) {
          console.error('Could not load orders:', error)
          setPageError(error.response?.data?.message || 'Could not load order history.')
        }
      } finally {
        if (isMounted) setOrdersLoaded(true)
      }
    }
    loadOrders()
    return () => { isMounted = false }
  }, [page])

  useEffect(() => {
    if (!orderId) return undefined
    let isMounted = true
    async function loadOrder() {
      try {
        const response = await axios.get(`${ACCOUNT_API}/orders/${encodeURIComponent(orderId)}`, { withCredentials: true })
        if (isMounted) {
          setSelectedOrder(response.data.order)
          setSelectedOrderId(orderId)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Could not load order detail:', error)
          setPageError(error.response?.data?.message || 'Could not load this order.')
        }
      }
    }
    loadOrder()
    return () => { isMounted = false }
  }, [orderId])

  const user = account?.user || {}
  const savedFoods = account?.savedFoods || []
  const addresses = account?.addresses || []
  const paymentMethods = account?.paymentMethods || []
  const recentOrders = account?.recentOrders || []
  const titleByPage = {
    profile: 'My Profile',
    orders: orderId ? 'Order Details' : 'My Orders',
    saved: 'Saved Items',
    addresses: 'Manage Addresses',
    payments: 'Payment Methods',
    edit: 'Edit Profile',
    settings: 'More Options',
    notifications: 'Notifications',
    help: 'Help & Support',
    terms: 'Terms & Privacy',
  }
  const pageTitle = titleByPage[page] || 'My Profile'

  const updateAccount = (updater) => {
    setAccount((current) => current ? updater(current) : current)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    setIsSaving(true)
    try {
      const response = await axios.patch(`${ACCOUNT_API}/profile`, payload, { withCredentials: true })
      updateAccount((current) => ({ ...current, user: response.data.user }))
      toast.success('Profile updated.')
      navigate('/account')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const uploadPhoto = async (event) => {
    const photo = event.target.files?.[0]
    if (!photo) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 5 * 1024 * 1024) {
      toast.error('Choose a JPG, PNG, or WebP image smaller than 5 MB.')
      event.target.value = ''
      return
    }
    const body = new FormData()
    body.append('photo', photo)
    try {
      const response = await axios.patch(`${ACCOUNT_API}/profile/photo`, body, { withCredentials: true })
      updateAccount((current) => ({ ...current, user: { ...current.user, profileImage: response.data.profileImage } }))
      toast.success('Profile photo updated.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload profile photo.')
    } finally {
      event.target.value = ''
    }
  }

  const saveAddress = async (event) => {
    event.preventDefault()
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
    setIsSaving(true)
    try {
      const isEditing = Boolean(addressEditor?._id)
      const url = isEditing ? `${ACCOUNT_API}/addresses/${addressEditor._id}` : `${ACCOUNT_API}/addresses`
      const response = await axios.request({
        method: isEditing ? 'PATCH' : 'POST',
        url,
        data: payload,
        withCredentials: true,
      })
      updateAccount((current) => {
        const nextAddresses = isEditing
          ? current.addresses.map((address) => address._id === response.data.address._id ? response.data.address : address)
          : [...current.addresses, response.data.address]
        return { ...current, addresses: nextAddresses }
      })
      setAddressEditor(null)
      toast.success(isEditing ? 'Address updated.' : 'Address added.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save address.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAddress = async (address) => {
    if (!window.confirm(`Delete this ${address.label || 'delivery'} address?`)) return
    try {
      await axios.delete(`${ACCOUNT_API}/addresses/${address._id}`, { withCredentials: true })
      updateAccount((current) => {
        let remaining = current.addresses.filter((item) => item._id !== address._id)
        if (address.isDefault && remaining.length) remaining = remaining.map((item, index) => ({ ...item, isDefault: index === 0 }))
        return { ...current, addresses: remaining }
      })
      toast.success('Address deleted.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete address.')
    }
  }

  const setDefaultAddress = async (address) => {
    try {
      await axios.patch(`${ACCOUNT_API}/addresses/${address._id}/default`, {}, { withCredentials: true })
      updateAccount((current) => ({
        ...current,
        addresses: current.addresses.map((item) => ({ ...item, isDefault: item._id === address._id })),
      }))
      toast.success('Default address updated.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update default address.')
    }
  }

  const addPayment = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())
    setIsSaving(true)
    try {
      const response = await axios.post(`${ACCOUNT_API}/payment-methods`, payload, { withCredentials: true })
      updateAccount((current) => ({ ...current, paymentMethods: [...current.paymentMethods, response.data.paymentMethod] }))
      setPaymentEditorOpen(false)
      toast.success('Payment method added.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not add payment method.')
    } finally {
      setIsSaving(false)
    }
  }

  const removePayment = async (method) => {
    if (!window.confirm(`Remove ${method.label || method.type}?`)) return
    try {
      await axios.delete(`${ACCOUNT_API}/payment-methods/${method._id}`, { withCredentials: true })
      updateAccount((current) => ({
        ...current,
        paymentMethods: current.paymentMethods.filter((item) => item._id !== method._id),
      }))
      toast.success('Payment method removed.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove payment method.')
    }
  }

  const setDefaultPayment = async (method) => {
    try {
      await axios.patch(`${ACCOUNT_API}/payment-methods/${method._id}/default`, {}, { withCredentials: true })
      updateAccount((current) => ({
        ...current,
        paymentMethods: current.paymentMethods.map((item) => ({ ...item, isDefault: item._id === method._id })),
      }))
      toast.success('Default payment method updated.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update payment method.')
    }
  }

  const toggleSaved = async (food) => {
    try {
      await axios.delete(`${ACCOUNT_API}/saved/${food._id}`, { withCredentials: true })
      updateAccount((current) => ({
        ...current,
        savedFoods: current.savedFoods.filter((item) => item._id !== food._id),
      }))
      toast.success('Removed from saved items.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update saved items.')
    }
  }

  const logout = async () => {
    try {
      await axios.get(`${USER_AUTH_API}/logout`, { withCredentials: true })
      setShowLogoutDialog(false)
      toast.success('You have been logged out.')
      navigate('/user/login', { replace: true })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not log out. Please try again.')
    }
  }

  const filteredOrders = useMemo(() => orderFilter === 'All'
    ? orders
    : orders.filter((order) => order.status === orderFilter), [orders, orderFilter])

  const navItems = [
    { to: '/', icon: 'home', label: 'Home' },
    { to: '/account/orders', icon: 'orders', label: 'Orders' },
    { to: '/account/saved', icon: 'saved', label: 'Saved' },
    { to: '/account', icon: 'profile', label: 'Profile' },
  ]

  if (isLoading) {
    return <main className="account-loading"><span className="account-spinner" /><p>Loading your account…</p></main>
  }

  if (!account) {
    return (
      <main className="account-loading">
        <p>{pageError || 'Could not load your account.'}</p>
        <button className="account-button account-button--primary" type="button" onClick={() => window.location.reload()}>Try again</button>
      </main>
    )
  }

  const renderOrderCard = (order) => {
    const firstItem = order.items?.[0]
    const food = firstItem?.food || firstItem
    const itemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0
    return (
      <article className="account-order-card" key={order._id}>
        <FoodImage food={food} className="account-order-card__image" />
        <div className="account-order-card__main">
          <div className="account-order-card__heading">
            <div>
              <h3>{firstItem?.name || food?.name || order.restaurantName || 'Food order'}</h3>
              <p>{order.restaurantName || 'Restaurant'}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <p className="account-order-card__meta">
            {new Date(order.createdAt).toLocaleString()} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
          <div className="account-order-card__footer">
            <strong>{formatPrice(order.total)}</strong>
            <Link to={`/account/orders/${order._id}`}>View details <AccountIcon name="arrow" /></Link>
          </div>
        </div>
      </article>
    )
  }

  const renderProfile = () => (
    <>
      <section className="account-profile-card">
        <div className="account-avatar">
          {user.profileImage
            ? <img src={user.profileImage} alt="" />
            : <span>{(user.fullname || 'U').trim().charAt(0).toUpperCase()}</span>}
        </div>
        <div className="account-profile-card__identity">
          <h2>{user.fullname || 'Insta-Zomato user'}</h2>
          <p>{user.email}</p>
          <p>{user.phone || 'Add your phone number'}</p>
        </div>
        <Link className="account-icon-button" to="/account/settings" aria-label="Open settings">
          <AccountIcon name="settings" />
        </Link>
        <Link className="account-button account-button--outline account-profile-card__edit" to="/account/edit">
          <AccountIcon name="edit" /> Edit profile
        </Link>
      </section>

      <section className="account-shortcuts" aria-label="Account shortcuts">
        {[
          { to: '/account/saved', icon: 'saved', label: 'Saved Items', count: `${savedFoods.length} saved` },
          { to: '/account/orders', icon: 'orders', label: 'My Orders', count: `${account.orderCount ?? orders.length} orders` },
          { to: '/account/addresses', icon: 'address', label: 'Addresses', count: `${addresses.length} addresses` },
          { to: '/account/payments', icon: 'payment', label: 'Payment Methods', count: `${paymentMethods.length} saved` },
        ].map((item) => (
          <Link className="account-shortcut" to={item.to} key={item.label}>
            <span className={`account-shortcut__icon account-shortcut__icon--${item.icon}`}><AccountIcon name={item.icon} /></span>
            <strong>{item.label}</strong>
            <small>{item.count}</small>
          </Link>
        ))}
      </section>

      <section className="account-plus-card">
        <span className="account-plus-card__crown"><AccountIcon name="crown" /></span>
        <div>
          <h3>Insta-Zomato Plus</h3>
          <p>Get member benefits and exclusive food offers.</p>
        </div>
        <button type="button" onClick={() => toast.info('Membership benefits will be available soon.')}>
          Explore <AccountIcon name="arrow" />
        </button>
      </section>

      <section className="account-section">
        <div className="account-section__heading">
          <h2>Recent Orders</h2>
          <Link to="/account/orders">See all <AccountIcon name="arrow" /></Link>
        </div>
        {recentOrders.length
          ? <div className="account-order-list">{recentOrders.slice(0, 3).map(renderOrderCard)}</div>
          : <EmptyState icon="orders" title="No orders yet" detail="Your recent food orders will show up here." action={<Link to="/account/orders">Browse order history</Link>} />}
      </section>

      <section className="account-settings-preview">
        <div className="account-section__heading">
          <h2>More options</h2>
          <Link to="/account/settings">View all <AccountIcon name="arrow" /></Link>
        </div>
        <SettingsList />
      </section>
      <button className="account-logout-button" type="button" onClick={() => setShowLogoutDialog(true)}>
        <AccountIcon name="logout" /> Log out
      </button>
    </>
  )

  const renderOrders = () => (
    <section className="account-section account-section--page">
      <div className="account-section__heading">
        <div><span className="account-eyebrow">Your food journey</span><h2>{orderId ? 'Order details' : 'Order history'}</h2></div>
        {!orderId && <span className="account-count">{orders.length} orders</span>}
      </div>
      {orderId ? (
        selectedOrder && selectedOrderId === orderId ? (
          <div className="account-order-detail">
            <div className="account-order-detail__top">
              <div><span className="account-eyebrow">Order placed</span><p>{new Date(selectedOrder.createdAt).toLocaleString()}</p></div>
              <StatusBadge status={selectedOrder.status} />
            </div>
            <div className="account-order-detail__restaurant"><h3>{selectedOrder.restaurantName}</h3><p>{selectedOrder.address}</p></div>
            {selectedOrder.items?.map((item, index) => (
              <div className="account-order-line" key={item.food?._id || index}>
                <FoodImage food={item.food || item} className="account-order-line__image" />
                <div><strong>{item.name || item.food?.name}</strong><small>Qty {item.quantity}</small></div>
                <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
              </div>
            ))}
            <div className="account-order-detail__total"><span>Order total</span><strong>{formatPrice(selectedOrder.total)}</strong></div>
            <p className="account-order-detail__payment">Payment: {selectedOrder.paymentLabel || 'Payment details unavailable'}</p>
          </div>
        ) : pageError ? <EmptyState title="Order unavailable" detail={pageError} action={<Link to="/account/orders">Back to orders</Link>} /> : <div className="account-inline-loading"><span className="account-spinner" />Loading order…</div>
      ) : (
        <>
          <div className="account-filter-row" role="tablist" aria-label="Filter orders">
            {['All', 'Processing', 'Delivered', 'Cancelled'].map((filter) => (
              <button type="button" role="tab" aria-selected={orderFilter === filter} className={orderFilter === filter ? 'is-active' : ''} key={filter} onClick={() => setOrderFilter(filter)}>{filter}</button>
            ))}
          </div>
          {!ordersLoaded
            ? <div className="account-inline-loading"><span className="account-spinner" />Loading orders…</div>
            : filteredOrders.length
            ? <div className="account-order-list">{filteredOrders.map(renderOrderCard)}</div>
            : <EmptyState icon="orders" title={orders.length ? 'No matching orders' : 'No orders yet'} detail={orders.length ? 'Try another status filter.' : 'Once you place an order, you can track it here.'} action={!orders.length && <Link to="/">Explore food reels</Link>} />}
        </>
      )}
    </section>
  )

  const renderSaved = () => (
    <section className="account-section account-section--page">
      <div className="account-section__heading"><div><span className="account-eyebrow">Your favourites</span><h2>Saved food</h2></div><span className="account-count">{savedFoods.length} items</span></div>
      {savedFoods.length ? (
        <div className="account-food-grid">
          {savedFoods.map((food) => {
            const partner = food.foodPartner || {}
            return (
              <article className="account-food-card" key={food._id}>
                <Link className="account-food-card__media" to={partner._id ? `/food-partner/profile/${partner._id}` : '/'} state={{ partner, foodItems: [food] }}>
                  <FoodImage food={food} />
                </Link>
                <button className="account-food-card__favorite" type="button" aria-label={`Remove ${food.name} from saved`} onClick={() => toggleSaved(food)}>
                  <AccountIcon name="saved" />
                </button>
                <div className="account-food-card__body">
                  <h3>{food.name}</h3>
                  <p>{partner.businessName || 'Restaurant'}</p>
                  <div><strong>{formatPrice(food.price)}</strong><Link to={partner._id ? `/food-partner/profile/${partner._id}` : '/'} state={{ partner, foodItems: [food] }}>View store <AccountIcon name="arrow" /></Link></div>
                </div>
              </article>
            )
          })}
        </div>
      ) : <EmptyState icon="saved" title="Nothing saved yet" detail="Save food from reels to find it quickly later." action={<Link to="/">Explore food reels</Link>} />}
    </section>
  )

  const renderAddresses = () => (
    <section className="account-section account-section--page">
      <div className="account-section__heading"><div><span className="account-eyebrow">Delivery preferences</span><h2>Manage addresses</h2></div><button className="account-button account-button--primary" type="button" onClick={() => setAddressEditor({})}><AccountIcon name="plus" /> Add new</button></div>
      {addresses.length ? (
        <div className="account-address-list">
          {addresses.map((address) => (
            <article className="account-address-card" key={address._id}>
              <span className="account-address-card__icon"><AccountIcon name={address.label === 'Office' ? 'office' : address.label === 'Home' ? 'home' : 'address'} /></span>
              <div className="account-address-card__body">
                <div className="account-address-card__title"><h3>{address.label}</h3>{address.isDefault && <span className="account-default-badge">Default</span>}</div>
                {address.recipientName && <p>{address.recipientName} · {address.phone}</p>}
                <p>{[address.line1, address.line2, address.city, address.state, address.postalCode].filter(Boolean).join(', ')}</p>
                {address.instructions && <small>{address.instructions}</small>}
                <div className="account-card-actions">
                  {!address.isDefault && <button type="button" onClick={() => setDefaultAddress(address)}>Set as default</button>}
                  <button type="button" onClick={() => setAddressEditor(address)}>Edit</button>
                  <button type="button" className="is-danger" onClick={() => deleteAddress(address)}><AccountIcon name="trash" /> Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon="address" title="No saved addresses" detail="Add a delivery address to make checkout quicker." action={<button className="account-button account-button--primary" onClick={() => setAddressEditor({})}><AccountIcon name="plus" /> Add address</button>} />}
    </section>
  )

  const renderPayments = () => (
    <section className="account-section account-section--page">
      <div className="account-section__heading"><div><span className="account-eyebrow">Secure checkout</span><h2>Payment methods</h2></div><button className="account-button account-button--primary" type="button" onClick={() => setPaymentEditorOpen(true)}><AccountIcon name="plus" /> Add new</button></div>
      <div className="account-payment-list">
        {paymentMethods.map((method) => (
          <article className="account-payment-card" key={method._id}>
            <span className="account-payment-card__icon"><AccountIcon name={method.type === 'COD' ? 'cash' : method.type === 'CARD' ? 'card' : 'payment'} /></span>
            <div className="account-payment-card__body"><div className="account-address-card__title"><h3>{method.type === 'COD' ? 'Cash on Delivery' : method.type === 'CARD' ? `${method.cardBrand || 'Card'} •••• ${method.last4}` : 'UPI'}</h3>{method.isDefault && <span className="account-default-badge">Default</span>}</div><p>{method.label || (method.type === 'COD' ? 'Pay when your order arrives' : method.upiId)}</p><div className="account-card-actions">{!method.isDefault && <button type="button" onClick={() => setDefaultPayment(method)}>Set as default</button>}<button type="button" className="is-danger" onClick={() => removePayment(method)}><AccountIcon name="trash" /> Remove</button></div></div>
          </article>
        ))}
        {!paymentMethods.some((method) => method.type === 'COD') && (
          <article className="account-payment-card account-payment-card--available"><span className="account-payment-card__icon"><AccountIcon name="cash" /></span><div className="account-payment-card__body"><h3>Cash on Delivery</h3><p>Available at checkout</p><button type="button" onClick={async () => {
            try {
              const response = await axios.post(`${ACCOUNT_API}/payment-methods`, { type: 'COD' }, { withCredentials: true })
              updateAccount((current) => ({ ...current, paymentMethods: [...current.paymentMethods, response.data.paymentMethod] }))
              toast.success('Cash on Delivery added.')
            } catch (error) { toast.error(error.response?.data?.message || 'Could not add Cash on Delivery.') }
          }}>Add method</button></div></article>
        )}
      </div>
      <p className="account-security-note">Card numbers and CVV are never stored here. Saved cards require a payment-provider tokenization integration.</p>
      {!paymentMethods.length && <EmptyState icon="payment" title="No saved payment methods" detail="Add a UPI ID or use Cash on Delivery when available." />}
    </section>
  )

  const renderEditProfile = () => (
    <section className="account-section account-section--page account-edit">
      <div className="account-section__heading"><div><span className="account-eyebrow">Account details</span><h2>Edit profile</h2></div></div>
      <div className="account-edit__photo">
        <div className="account-avatar account-avatar--large">{user.profileImage ? <img src={user.profileImage} alt="" /> : <span>{(user.fullname || 'U').trim().charAt(0).toUpperCase()}</span>}</div>
        <label className="account-button account-button--outline" htmlFor="profile-photo">Change photo</label>
        <input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPhoto} />
        <small>JPG, PNG or WebP · Maximum 5 MB</small>
      </div>
      <form className="account-form" onSubmit={saveProfile}>
        <label>Full name<input name="fullname" required minLength={1} maxLength={100} defaultValue={user.fullname || ''} /></label>
        <label>Email address<input name="email" type="email" required defaultValue={user.email || ''} /></label>
        <label>Mobile number<input name="phone" type="tel" maxLength={20} pattern="[+0-9() -]{7,20}" title="Enter a valid phone number." defaultValue={user.phone || ''} /></label>
        <div className="account-form__actions"><Link className="account-button account-button--outline" to="/account">Cancel</Link><button className="account-button account-button--primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </section>
  )

  const renderSettings = () => (
    <section className="account-section account-section--page">
      <div className="account-section__heading"><div><span className="account-eyebrow">Manage your experience</span><h2>More options</h2></div></div>
      <SettingsList />
      <button className="account-logout-button account-logout-button--page" type="button" onClick={() => setShowLogoutDialog(true)}><AccountIcon name="logout" /> Log out</button>
    </section>
  )

  const renderSimplePage = () => {
    if (page === 'notifications') {
      return <section className="account-section account-section--page"><div className="account-section__heading"><div><span className="account-eyebrow">Stay in the loop</span><h2>Notifications</h2></div></div><EmptyState icon="bell" title="You're all caught up" detail="Order and delivery notifications will appear here." /></section>
    }
    if (page === 'help') {
      return <section className="account-section account-section--page"><div className="account-section__heading"><div><span className="account-eyebrow">We're here to help</span><h2>Help & Support</h2></div></div><div className="account-info-card"><h3>Need a hand?</h3><p>For account or order support, contact our support team.</p><a href="mailto:support@instazomato.com">Email support</a></div></section>
    }
    return <section className="account-section account-section--page"><div className="account-section__heading"><div><span className="account-eyebrow">Your privacy matters</span><h2>Terms & Privacy</h2></div></div><div className="account-info-card"><h3>Privacy first</h3><p>Your account information is used to provide food discovery and delivery features. Payment card details are not stored by this app.</p><h3>Using Insta-Zomato</h3><p>Use your account responsibly and keep your sign-in credentials secure.</p></div></section>
  }

  let content
  if (page === 'profile') content = renderProfile()
  else if (page === 'orders') content = renderOrders()
  else if (page === 'saved') content = renderSaved()
  else if (page === 'addresses') content = renderAddresses()
  else if (page === 'payments') content = renderPayments()
  else if (page === 'edit') content = renderEditProfile()
  else if (page === 'settings') content = renderSettings()
  else content = renderSimplePage()

  return (
    <main className="account-page">
      <div className="account-shell">
        <header className="account-header">
          <Link className="account-back" to={page === 'profile' ? '/' : '/account'} aria-label={page === 'profile' ? 'Go to home' : 'Back to profile'}>
            <AccountIcon name="back" />
          </Link>
          <div className="account-header__title"><span>Insta-<strong>Zomato</strong></span><h1>{pageTitle}</h1></div>
          <Link to="/account/settings" className="account-icon-button" aria-label="Settings"><AccountIcon name="settings" /></Link>
        </header>

        {pageError && <div className="account-error" role="alert">{pageError}<button type="button" onClick={() => setPageError('')}><AccountIcon name="close" /></button></div>}
        {content}

        <nav className="account-bottom-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              className={(
                (item.label === 'Home' && location.pathname === '/') ||
                (item.label === 'Orders' && page === 'orders') ||
                (item.label === 'Saved' && page === 'saved') ||
                (item.label === 'Profile' && page === 'profile')
              ) ? 'is-active' : ''}
              to={item.to}
              key={item.label}
            >
              <AccountIcon name={item.icon} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {addressEditor && (
        <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddressEditor(null) }}>
          <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
            <div className="account-modal__heading"><h2 id="address-modal-title">{addressEditor._id ? 'Edit address' : 'Add address'}</h2><button type="button" onClick={() => setAddressEditor(null)} aria-label="Close"><AccountIcon name="close" /></button></div>
            <form className="account-form account-form--modal" onSubmit={saveAddress}>
              <label>Label<select name="label" defaultValue={addressEditor.label || 'Home'}><option>Home</option><option>Office</option><option>Other</option></select></label>
              <label>Recipient name<input name="recipientName" maxLength={100} defaultValue={addressEditor.recipientName || user.fullname || ''} /></label>
              <label>Phone number<input name="phone" type="tel" maxLength={20} defaultValue={addressEditor.phone || user.phone || ''} /></label>
              <label>Address line 1<input name="line1" required maxLength={200} defaultValue={addressEditor.line1 || ''} /></label>
              <label>Address line 2<input name="line2" maxLength={200} defaultValue={addressEditor.line2 || ''} /></label>
              <div className="account-form__row"><label>City<input name="city" required maxLength={100} defaultValue={addressEditor.city || ''} /></label><label>State<input name="state" required maxLength={100} defaultValue={addressEditor.state || ''} /></label></div>
              <label>Postal code<input name="postalCode" required maxLength={20} defaultValue={addressEditor.postalCode || ''} /></label>
              <label>Delivery instructions<input name="instructions" maxLength={300} defaultValue={addressEditor.instructions || ''} /></label>
              <div className="account-form__actions"><button type="button" className="account-button account-button--outline" onClick={() => setAddressEditor(null)}>Cancel</button><button className="account-button account-button--primary" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save address'}</button></div>
            </form>
          </section>
        </div>
      )}

      {paymentEditorOpen && (
        <div className="account-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaymentEditorOpen(false) }}>
          <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
            <div className="account-modal__heading"><h2 id="payment-modal-title">Add payment method</h2><button type="button" onClick={() => setPaymentEditorOpen(false)} aria-label="Close"><AccountIcon name="close" /></button></div>
            <form className="account-form account-form--modal" onSubmit={addPayment}>
              <label>Payment type<select name="type"><option value="UPI">UPI</option><option value="COD">Cash on Delivery</option><option value="CARD">Tokenized card</option></select></label>
              <label>UPI ID<input name="upiId" placeholder="name@bank" /></label>
              <p className="account-security-note">For cards, enter only payment-provider token details. Never enter a full card number or CVV. This project has no card processor connected yet.</p>
              <label>Card brand (tokenized only)<input name="cardBrand" placeholder="e.g. Visa" /></label>
              <label>Last 4 digits<input name="last4" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1234" /></label>
              <label>Provider token<input name="providerToken" autoComplete="off" placeholder="Payment processor token" /></label>
              <div className="account-form__actions"><button type="button" className="account-button account-button--outline" onClick={() => setPaymentEditorOpen(false)}>Cancel</button><button className="account-button account-button--primary" disabled={isSaving}>{isSaving ? 'Saving…' : 'Add method'}</button></div>
            </form>
          </section>
        </div>
      )}

      {showLogoutDialog && (
        <div className="account-modal-backdrop" role="presentation">
          <section className="account-logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="logout-title">
            <span className="account-logout-dialog__icon"><AccountIcon name="logout" /></span>
            <h2 id="logout-title">Log out?</h2>
            <p>Are you sure you want to log out of Insta-Zomato?</p>
            <div><button className="account-button account-button--outline" type="button" onClick={() => setShowLogoutDialog(false)}>Cancel</button><button className="account-button account-button--danger" type="button" onClick={logout}>Log out</button></div>
          </section>
        </div>
      )}
    </main>
  )
}

function SettingsList() {
  const options = [
    { to: '/account/edit', icon: 'profile', title: 'My Details', detail: 'Name, email and phone' },
    { to: '/account/addresses', icon: 'address', title: 'Manage Addresses' },
    { to: '/account/payments', icon: 'payment', title: 'Payment Methods' },
    { to: '/account/notifications', icon: 'bell', title: 'Notifications' },
    { to: '/account/help', icon: 'help', title: 'Help & Support' },
    { to: '/account/terms', icon: 'terms', title: 'Terms & Privacy Policy' },
  ]
  return (
    <div className="account-settings-list">
      {options.map((option) => (
        <Link to={option.to} className="account-settings-row" key={option.to}>
          <span className="account-settings-row__icon"><AccountIcon name={option.icon} /></span>
          <span className="account-settings-row__text"><strong>{option.title}</strong>{option.detail && <small>{option.detail}</small>}</span>
          <AccountIcon className="account-settings-row__arrow" name="arrow" />
        </Link>
      ))}
    </div>
  )
}

export default UserAccount
