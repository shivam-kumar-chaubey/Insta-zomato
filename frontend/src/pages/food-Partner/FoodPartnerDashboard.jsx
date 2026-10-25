import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import './FoodPartnerDashboard.css'

const API = 'http://localhost:3000/api/partner'

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', icon: 'grid' },
  { id: 'restaurant', label: 'My Restaurant', icon: 'store' },
  { id: 'foods', label: 'Food Items', icon: 'food' },
  { id: 'reels', label: 'Reels / Videos', icon: 'reel' },
  { id: 'orders', label: 'Orders', icon: 'orders' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'reviews', label: 'Reviews', icon: 'star' },
  { id: 'earnings', label: 'Earnings', icon: 'wallet' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

function PartnerIcon({ name }) {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    store: <><path d="M3 10h18l-1.5-6h-15L3 10Z" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    food: <><path d="M4 11h16l-1 9H5l-1-9Z" /><path d="M8 9c-1-2 1-3 0-5m4 5c-1-2 1-3 0-5m4 5c-1-2 1-3 0-5" /></>,
    reel: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m10 9 5 3-5 3V9ZM7 4l3 4m4-4 3 4m2-4 2 3" /></>,
    orders: <><path d="M5 4h14v17H5zM8 8h8m-8 4h8m-8 4h5" /><path d="M9 4V2h6v2" /></>,
    chart: <><path d="M3 20h18M6 16v-5m6 5V4m6 12V8" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18m-5 5h2" /></>,
    plus: <path d="M12 5v14m-7-7h14" />,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    edit: <><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z" /><path d="m13.5 6.5 4 4" /></>,
    trash: <><path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
    back: <><path d="m14 5-7 7 7 7m-7-7h14" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-1.9l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 1.9Z" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[name] || icons.grid}</svg>
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0)
}

function formatMoneyExact(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

function formatDate(date) {
  if (!date) return 'Date unavailable'
  return new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function EmptyPanel({ title, detail, action }) {
  return (
    <div className="partner-empty">
      <span className="partner-empty__mark"><PartnerIcon name="food" /></span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  )
}

function FoodPartnerDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathParts = location.pathname.split('/').filter(Boolean)
  const isDashboardAlias = pathParts[0] === 'food-partner'
  const rootPath = isDashboardAlias ? '/food-partner/dashboard' : '/create-food'
  const pageIndex = isDashboardAlias ? 2 : 1
  const page = pathParts[pageIndex] || 'overview'
  const orderId = page === 'orders' ? pathParts[pageIndex + 1] : ''
  const pageLabel = NAV_ITEMS.find((item) => item.id === page)?.label || (
    page === 'new-reel' ? 'Create Food Reel' : 'Order Details'
  )

  const [dashboard, setDashboard] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [orders, setOrders] = useState([])
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [orderDetail, setOrderDetail] = useState(null)
  const [detailLoadedId, setDetailLoadedId] = useState('')
  const [detailError, setDetailError] = useState('')
  const [detailErrorId, setDetailErrorId] = useState('')
  const [report, setReport] = useState(null)
  const [reportPage, setReportPage] = useState('')
  const [payoutAccount, setPayoutAccount] = useState(null)
  const [payoutAccountLoaded, setPayoutAccountLoaded] = useState(false)
  const [payoutSaving, setPayoutSaving] = useState(false)
  const [payoutProcessing, setPayoutProcessing] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [imagesSaving, setImagesSaving] = useState(false)
  const [foodSaving, setFoodSaving] = useState(false)
  const [foodEditor, setFoodEditor] = useState(null)
  const [orderFilter, setOrderFilter] = useState('All')
  const [reelFilter, setReelFilter] = useState('All')

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      try {
        const response = await axios.get(`${API}/dashboard`, { withCredentials: true })
        if (active) setDashboard(response.data)
      } catch (error) {
        if (!active) return
        if (error.response?.status === 401) {
          navigate('/food-partner/login', { replace: true })
          return
        }
        console.error('Could not load partner dashboard:', error)
        toast.error(error.response?.data?.message || 'Could not load the partner dashboard.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadDashboard()
    return () => { active = false }
  }, [navigate, refreshKey])

  useEffect(() => {
    if (page !== 'orders' || orderId) return undefined
    let active = true
    async function loadOrders() {
      try {
        const response = await axios.get(`${API}/orders`, { withCredentials: true })
        if (active) setOrders(response.data.orders || [])
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || 'Could not load orders.')
      } finally {
        if (active) setOrdersLoaded(true)
      }
    }
    loadOrders()
    return () => { active = false }
  }, [page, orderId, refreshKey])

  useEffect(() => {
    if (!orderId) return undefined
    let active = true
    async function loadOrder() {
      try {
        const response = await axios.get(`${API}/orders/${encodeURIComponent(orderId)}`, { withCredentials: true })
        if (active) {
          setOrderDetail(response.data.order)
          setDetailLoadedId(orderId)
        }
      } catch (error) {
        if (active) {
          setDetailError(error.response?.data?.message || 'Could not load order details.')
          setDetailErrorId(orderId)
        }
      }
    }
    loadOrder()
    return () => { active = false }
  }, [orderId])

  useEffect(() => {
    if (page !== 'analytics' && page !== 'earnings') return undefined
    let active = true
    async function loadReport() {
      try {
        const response = await axios.get(`${API}/${page}`, { withCredentials: true })
        if (active) {
          setReport(response.data)
          setReportPage(page)
        }
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || `Could not load ${page}.`)
      }
    }
    loadReport()
    return () => { active = false }
  }, [page, refreshKey])

  useEffect(() => {
    if (page !== 'settings') return undefined
    let active = true
    async function loadPayoutAccount() {
      try {
        const response = await axios.get(`${API}/payout-account`, { withCredentials: true })
        if (active) setPayoutAccount(response.data.payoutAccount)
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || 'Could not load payout account status.')
      } finally {
        if (active) setPayoutAccountLoaded(true)
      }
    }
    loadPayoutAccount()
    return () => { active = false }
  }, [page, refreshKey])

  const partner = dashboard?.partner || {}
  const foodItems = dashboard?.foodItems || []
  const analytics = dashboard?.analytics || { stats: {}, revenueByDay: [], topFoods: [] }
  const stats = analytics.stats || {}
  const analyticsReport = reportPage === 'analytics' ? report : analytics
  const filteredOrders = useMemo(() => orderFilter === 'All'
    ? orders
    : orders.filter((order) => order.status === orderFilter), [orders, orderFilter])

  const go = (destination) => navigate(`${rootPath}${destination ? `/${destination}` : ''}`)
  const refresh = () => setRefreshKey((current) => current + 1)

  const saveProfile = async (event) => {
    event.preventDefault()
    setProfileSaving(true)
    const body = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      const response = await axios.patch(`${API}/profile`, body, { withCredentials: true })
      setDashboard((current) => ({ ...current, partner: response.data.partner }))
      toast.success('Restaurant details saved.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save restaurant details.')
    } finally {
      setProfileSaving(false)
    }
  }

  const setupPayoutAccount = async (event) => {
    event.preventDefault()
    setPayoutSaving(true)
    const form = event.currentTarget
    const body = Object.fromEntries(new FormData(form).entries())
    body.tncAccepted = body.tncAccepted === 'on'
    try {
      const response = await axios.post(`${API}/payout-account`, body, { withCredentials: true })
      setPayoutAccount(response.data.payoutAccount)
      form.reset()
      toast.success(response.data.message || 'Payout account submitted to Razorpay.')
      refresh()
    } catch (error) {
      if (error.response?.data?.payoutAccount) setPayoutAccount(error.response.data.payoutAccount)
      toast.error(error.response?.data?.message || 'Could not set up the payout account.')
    } finally {
      setPayoutSaving(false)
    }
  }

  const processPendingPayouts = async () => {
    setPayoutProcessing(true)
    try {
      const response = await axios.post(`${API}/payout-account/process-pending`, {}, { withCredentials: true })
      toast.success(response.data.message || 'Eligible payouts checked.')
      refresh()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not process eligible payouts.')
    } finally {
      setPayoutProcessing(false)
    }
  }

  const saveProfileImages = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const body = new FormData(form)
    if (!body.get('profileImage')?.size && !body.get('backgroundImage')?.size) {
      toast.info('Choose a profile picture or background picture first.')
      return
    }
    setImagesSaving(true)
    try {
      const response = await axios.patch(`${API}/profile/images`, body, { withCredentials: true })
      setDashboard((current) => ({
        ...current,
        partner: {
          ...current.partner,
          profileImage: response.data.profileImage,
          backgroundImage: response.data.backgroundImage,
        },
      }))
      form.reset()
      toast.success('Restaurant pictures updated.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload restaurant pictures.')
    } finally {
      setImagesSaving(false)
    }
  }

  const createReel = async (event) => {
    event.preventDefault()
    setFoodSaving(true)
    const form = event.currentTarget
    const formData = new FormData(form)
    try {
      await axios.post(`${API}/foods`, formData, { withCredentials: true })
      toast.success('Food reel uploaded.')
      form.reset()
      refresh()
      go('reels')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload the food reel.')
    } finally {
      setFoodSaving(false)
    }
  }

  const saveFoodEdit = async (event) => {
    event.preventDefault()
    setFoodSaving(true)
    const body = Object.fromEntries(new FormData(event.currentTarget).entries())
    try {
      await axios.patch(`${API}/foods/${foodEditor._id}`, body, { withCredentials: true })
      setFoodEditor(null)
      toast.success('Food item updated.')
      refresh()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update food item.')
    } finally {
      setFoodSaving(false)
    }
  }

  const deleteFood = async (food) => {
    if (!window.confirm(`Delete "${food.name}"? This cannot be undone.`)) return
    try {
      await axios.delete(`${API}/foods/${food._id}`, { withCredentials: true })
      toast.success('Food item deleted.')
      refresh()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete food item.')
    }
  }

  const updateFoodStatus = async (food) => {
    const status = food.status === 'Draft' ? 'Published' : 'Draft'
    try {
      await axios.patch(`${API}/foods/${food._id}`, { status }, { withCredentials: true })
      toast.success(status === 'Draft' ? 'Reel moved to drafts.' : 'Reel published.')
      refresh()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update reel status.')
    }
  }

  const updateOrderStatus = async (order, status) => {
    try {
      await axios.patch(`${API}/orders/${order._id}/status`, { status }, { withCredentials: true })
      toast.success('Order status updated.')
      if (orderId) {
        const response = await axios.get(`${API}/orders/${order._id}`, { withCredentials: true })
        setOrderDetail(response.data.order)
      }
      refresh()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update order status.')
    }
  }

  const logout = async () => {
    try {
      await axios.post(`${API}/logout`, {}, { withCredentials: true })
      navigate('/food-partner/login', { replace: true })
      toast.success('Logged out.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not log out.')
    }
  }

  if (isLoading) {
    return <main className="partner-loading"><span className="partner-spinner" /><p>Loading partner dashboard…</p></main>
  }

  if (!dashboard) {
    return <main className="partner-loading"><p>Dashboard could not be loaded.</p><button type="button" onClick={refresh}>Try again</button></main>
  }

  const renderStat = (label, value, icon, note) => (
    <article className="partner-stat" key={label}>
      <span className={`partner-stat__icon partner-stat__icon--${icon}`}><PartnerIcon name={icon} /></span>
      <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </article>
  )

  const renderOrderCard = (order) => (
    <article className="partner-order-row" key={order._id}>
      <div className="partner-order-row__identity">
        <span className="partner-order-row__thumb">{order.items?.[0]?.video ? <video src={order.items[0].video} muted playsInline /> : <PartnerIcon name="food" />}</span>
        <div><strong>#{String(order._id).slice(-7).toUpperCase()}</strong><span>{order.user?.fullname || 'Customer'}</span><small>{formatDate(order.createdAt)}</small></div>
      </div>
      <div className="partner-order-row__items">{order.items?.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</div>
      <strong className="partner-order-row__amount">{formatMoney(order.total)}</strong>
      <span className={`partner-status partner-status--${(order.status || 'processing').toLowerCase()}`}>{order.status}</span>
      <Link className="partner-text-link" to={`${rootPath}/orders/${order._id}`}>Details <PartnerIcon name="arrow" /></Link>
    </article>
  )

  const renderOverview = () => (
    <>
      <section className="partner-welcome">
        <div><span className="partner-eyebrow">Partner workspace</span><h2>Welcome back, {partner.contactName || partner.businessName}!</h2><p>Here’s what’s happening with your restaurant.</p></div>
        <div className="partner-welcome__actions">
          {partner._id && <Link className="partner-button partner-button--secondary" to={`/food-partner/profile/${partner._id}`}>View public store</Link>}
          <button className="partner-button partner-button--primary" type="button" onClick={() => go('new-reel')}><PartnerIcon name="plus" /> Create food reel</button>
        </div>
      </section>
      <section className="partner-stats">
        {renderStat('Total orders', stats.totalOrders ?? 0, 'orders', `${stats.activeOrders ?? 0} active`)}
        {renderStat('Revenue', formatMoney(stats.totalRevenue), 'wallet', 'From recorded orders')}
        {renderStat('Food items', stats.totalFoodItems ?? 0, 'food', 'Your menu')}
        {renderStat('Published reels', stats.publishedReels ?? 0, 'reel', `${stats.drafts ?? 0} drafts`)}
      </section>
      <div className="partner-overview-grid">
        <section className="partner-panel partner-panel--chart">
          <div className="partner-panel__heading"><div><span className="partner-eyebrow">Performance</span><h2>Revenue overview</h2></div><span className="partner-range-label">Last 7 days</span></div>
          {analytics.revenueByDay?.some((day) => day.revenue > 0) ? (
            <div className="partner-chart" aria-label="Revenue for the last seven days">
              {analytics.revenueByDay.map((day) => {
                const maximum = Math.max(...analytics.revenueByDay.map((entry) => entry.revenue), 1)
                return <div className="partner-chart__column" key={day.date}><strong>{day.revenue ? formatMoney(day.revenue) : ''}</strong><span style={{ height: `${Math.max((day.revenue / maximum) * 100, 4)}%` }} /><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</small></div>
              })}
            </div>
          ) : <EmptyPanel title="No revenue data yet" detail="Revenue analytics will appear when real customer orders are recorded." />}
        </section>
        <section className="partner-panel">
          <div className="partner-panel__heading"><div><span className="partner-eyebrow">Your menu</span><h2>Popular items</h2></div><button className="partner-text-link partner-button--link" onClick={() => go('foods')} type="button">View all <PartnerIcon name="arrow" /></button></div>
          {analytics.topFoods?.filter((food) => food.quantity > 0).length ? analytics.topFoods.filter((food) => food.quantity > 0).map((food) => (
            <div className="partner-top-food" key={food.foodId}><span>{food.name}</span><strong>{food.quantity} ordered</strong><small>{formatMoney(food.revenue)}</small></div>
          )) : <EmptyPanel title="No item sales yet" detail="Item performance will be based on orders, not sample data." />}
        </section>
      </div>
      <section className="partner-panel">
        <div className="partner-panel__heading"><div><span className="partner-eyebrow">Latest activity</span><h2>Recent orders</h2></div><button className="partner-text-link partner-button--link" type="button" onClick={() => go('orders')}>All orders <PartnerIcon name="arrow" /></button></div>
        {dashboard.recentOrders?.length ? dashboard.recentOrders.map(renderOrderCard) : <EmptyPanel title="No orders yet" detail="New customer orders will appear here." />}
      </section>
    </>
  )

  const renderRestaurant = () => (
    <section className="partner-panel partner-panel--form">
      <div className="partner-panel__heading"><div><span className="partner-eyebrow">Store profile</span><h2>Restaurant details</h2><p>Update information customers see on your store profile.</p></div></div>
      <form className="partner-image-form" onSubmit={saveProfileImages}>
        <div className="partner-image-preview partner-image-preview--profile">
          {partner.profileImage ? <img src={partner.profileImage} alt="Current restaurant profile" /> : <span>{(partner.businessName || 'R').trim().charAt(0).toUpperCase()}</span>}
          <div><strong>Profile picture</strong><small>Shown as your store logo.</small></div>
        </div>
        <label className="partner-image-picker">Choose profile picture<input name="profileImage" type="file" accept="image/png,image/jpeg,image/webp" /><small>JPG, PNG or WebP · Max 5 MB</small></label>
        <div className="partner-image-preview partner-image-preview--background">
          {partner.backgroundImage ? <img src={partner.backgroundImage} alt="Current restaurant cover" /> : <span>Store cover preview</span>}
        </div>
        <label className="partner-image-picker">Choose background picture<input name="backgroundImage" type="file" accept="image/png,image/jpeg,image/webp" /><small>Replaces the video header on your public store · Max 5 MB</small></label>
        <div className="partner-form__actions"><button className="partner-button partner-button--primary" type="submit" disabled={imagesSaving}>{imagesSaving ? 'Uploading…' : 'Save pictures'}</button></div>
      </form>
      <form className="partner-form" onSubmit={saveProfile}>
        <label>Restaurant name<input name="businessName" required maxLength={120} defaultValue={partner.businessName || ''} /></label>
        <label>Contact name<input name="contactName" required maxLength={100} defaultValue={partner.contactName || ''} /></label>
        <label>Email address<input name="email" type="email" required maxLength={254} defaultValue={partner.email || ''} /></label>
        <label>Contact number<input name="phone" type="tel" required pattern="[+0-9() -]{7,20}" defaultValue={partner.phone || ''} /></label>
        <label>Cuisine types<input name="cuisineType" maxLength={100} placeholder="e.g. North Indian, Chinese" defaultValue={partner.cuisineType || ''} /></label>
        <label>Opening hours<input name="openingHours" maxLength={100} placeholder="e.g. 11:00 AM – 11:00 PM" defaultValue={partner.openingHours || ''} /></label>
        <label className="partner-form__wide">Restaurant address<textarea name="address" required rows="2" maxLength={300} defaultValue={partner.address || ''} /></label>
        <label className="partner-form__wide">About your restaurant<textarea name="description" rows="4" maxLength={1000} placeholder="Tell customers about your food and restaurant." defaultValue={partner.description || ''} /></label>
        <div className="partner-form__actions"><button className="partner-button partner-button--primary" type="submit" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </section>
  )

  const renderFoodItems = (reelsOnly = false) => {
    const visibleFoods = reelsOnly
      ? foodItems.filter((food) => reelFilter === 'All' || (reelFilter === 'Drafts' ? food.status === 'Draft' : food.status !== 'Draft'))
      : foodItems
    return (
      <section className="partner-panel">
        <div className="partner-panel__heading"><div><span className="partner-eyebrow">{reelsOnly ? 'Published videos & drafts' : 'Manage your menu'}</span><h2>{reelsOnly ? 'My reels' : 'Food items'}</h2><p>{reelsOnly ? 'Publish a reel or keep it as a draft.' : 'Add, edit, publish, or remove menu items.'}</p></div><button className="partner-button partner-button--primary" type="button" onClick={() => go('new-reel')}><PartnerIcon name="plus" /> Create reel</button></div>
        {reelsOnly && <div className="partner-filter-row">{['All', 'Published', 'Drafts'].map((filter) => <button type="button" key={filter} className={reelFilter === filter ? 'is-active' : ''} onClick={() => setReelFilter(filter)}>{filter}</button>)}</div>}
        {foodItems.length ? (
          <div className="partner-food-grid">
            {visibleFoods.map((food) => (
              <article className="partner-food-card" key={food._id}>
                <div className="partner-food-card__media"><video src={food.video} controls muted playsInline preload="metadata" /><span className={`partner-status partner-status--${food.status === 'Draft' ? 'draft' : 'delivered'}`}>{food.status || 'Published'}</span></div>
                <div className="partner-food-card__body"><div><span className="partner-eyebrow">{food.category || 'Menu item'}</span><h3>{food.name}</h3></div><div className="partner-food-card__meta"><strong>{food.price ? formatMoney(food.price) : 'Price not set'}</strong><span>{food.rating ? `Partner rating ${Number(food.rating).toFixed(1)} / 5` : 'No rating'}</span></div>{food.description && <p>{food.description}</p>}<div className="partner-food-card__actions"><button type="button" onClick={() => setFoodEditor(food)}><PartnerIcon name="edit" /> Edit</button><button type="button" onClick={() => updateFoodStatus(food)}>{food.status === 'Draft' ? 'Publish' : 'Move to draft'}</button><button className="is-danger" type="button" onClick={() => deleteFood(food)} aria-label={`Delete ${food.name}`}><PartnerIcon name="trash" /></button></div></div>
              </article>
            ))}
            {!visibleFoods.length && <EmptyPanel title={reelFilter === 'Drafts' ? 'No draft reels' : 'No published reels'} detail={reelFilter === 'Drafts' ? 'Save a reel as a draft when creating or editing it.' : 'Your drafts stay private until you publish them.'} action={<button className="partner-button partner-button--primary" type="button" onClick={() => go('new-reel')}>Create reel</button>} />}
          </div>
        ) : <EmptyPanel title="Your menu is empty" detail="Upload your first food video to add a menu item and reel." action={<button className="partner-button partner-button--primary" type="button" onClick={() => go('new-reel')}><PartnerIcon name="plus" /> Add food reel</button>} />}
      </section>
    )
  }

  const renderNewReel = () => (
    <section className="partner-panel partner-panel--form">
      <div className="partner-panel__heading"><div><span className="partner-eyebrow">Share your food</span><h2>Create food reel</h2><p>Upload a short video with its menu title and description.</p></div></div>
      <form className="partner-form" onSubmit={createReel}>
        <label>Food title<input name="name" required maxLength={120} placeholder="e.g. Paneer Tikka" /></label>
        <label>Category<input name="category" maxLength={80} placeholder="e.g. Starters" /></label>
        <label>Price (INR)<input name="price" type="number" required min="0.01" max="1000000" step="0.01" placeholder="e.g. 249" /></label>
        <label>Partner-provided rating<input name="rating" type="number" required min="1" max="5" step="0.1" placeholder="1 to 5" /><small>This rating is provided by you, not customer reviews.</small></label>
        <label className="partner-form__wide">Description<textarea name="description" rows="3" maxLength={500} placeholder="Describe this dish for customers." /></label>
        <label className="partner-form__wide partner-file-field">Food video<input name="video" type="file" accept="video/mp4,video/webm,video/quicktime" required /><small>MP4, WebM, or MOV. Maximum 100 MB.</small></label>
        <label>Publish status<select name="status" defaultValue="Published"><option value="Published">Publish now</option><option value="Draft">Save as draft</option></select></label>
        <div className="partner-form__actions"><button className="partner-button partner-button--primary" type="submit" disabled={foodSaving}>{foodSaving ? 'Uploading…' : 'Upload reel'}</button><button className="partner-button partner-button--secondary" type="button" onClick={() => go('reels')}>Cancel</button></div>
      </form>
    </section>
  )

  const renderOrders = () => {
    if (orderId) {
      const order = detailLoadedId === orderId ? orderDetail : null
      if (!order && detailErrorId === orderId) return <section className="partner-panel"><EmptyPanel title="Order unavailable" detail={detailError} action={<button className="partner-button partner-button--secondary" type="button" onClick={() => go('orders')}>Back to orders</button>} /></section>
      if (!order) return <div className="partner-loading partner-loading--inline"><span className="partner-spinner" /><p>Loading order…</p></div>
      return (
        <section className="partner-panel partner-order-detail">
          <button className="partner-text-link partner-button--link" type="button" onClick={() => go('orders')}><PartnerIcon name="back" /> Back to orders</button>
          <div className="partner-panel__heading"><div><span className="partner-eyebrow">Order #{String(order._id).slice(-7).toUpperCase()}</span><h2>Order details</h2><p>Placed {formatDate(order.createdAt)}</p></div><span className={`partner-status partner-status--${(order.status || 'processing').toLowerCase()}`}>{order.status}</span></div>
          <div className="partner-order-customer"><strong>{order.user?.fullname || 'Customer'}</strong><span>{order.user?.phone || 'Customer phone unavailable'}</span><span>{order.address}</span></div>
          <div className="partner-order-detail__items">{order.items?.map((item, index) => <div key={item.food?._id || index}><span>{item.name} × {item.quantity}</span><strong>{formatMoney(item.unitPrice * item.quantity)}</strong></div>)}</div>
          <div className="partner-order-detail__total"><span>Order total</span><strong>{formatMoney(order.total)}</strong></div>
          <label className="partner-status-editor">Update order status<select value={order.status} onChange={(event) => updateOrderStatus(order, event.target.value)}><option>Processing</option><option>Delivered</option><option>Cancelled</option></select></label>
        </section>
      )
    }
    return (
      <section className="partner-panel">
        <div className="partner-panel__heading"><div><span className="partner-eyebrow">Incoming orders</span><h2>Orders</h2><p>Review orders associated with your menu items.</p></div></div>
        <div className="partner-filter-row">{['All', 'Processing', 'Delivered', 'Cancelled'].map((filter) => <button type="button" key={filter} className={orderFilter === filter ? 'is-active' : ''} onClick={() => setOrderFilter(filter)}>{filter}</button>)}</div>
        {!ordersLoaded ? <div className="partner-loading partner-loading--inline"><span className="partner-spinner" /><p>Loading orders…</p></div>
          : filteredOrders.length ? <div className="partner-order-list">{filteredOrders.map(renderOrderCard)}</div>
            : <EmptyPanel title={orders.length ? 'No orders in this status' : 'No orders yet'} detail={orders.length ? 'Choose another status filter.' : 'Orders will show up here when customers place them.'} />}
      </section>
    )
  }

  const renderAnalytics = () => (
    <>
      <section className="partner-stats partner-stats--compact">
        {renderStat('Total orders', stats.totalOrders ?? 0, 'orders', `${stats.deliveredOrders ?? 0} delivered`)}
        {renderStat('Recorded revenue', formatMoney(stats.totalRevenue), 'wallet', 'Excludes cancelled orders')}
        {renderStat('Average order value', stats.activeOrders + stats.deliveredOrders ? formatMoney(stats.totalRevenue / (stats.activeOrders + stats.deliveredOrders)) : formatMoney(0), 'chart', 'Based on recorded orders')}
        {renderStat('Published reels', stats.publishedReels ?? 0, 'reel', `${stats.drafts ?? 0} drafts`)}
      </section>
      {reportPage === 'analytics' ? <>
        <section className="partner-panel partner-panel--chart"><div className="partner-panel__heading"><div><span className="partner-eyebrow">Last seven days</span><h2>Revenue overview</h2></div></div>{analyticsReport.revenueByDay?.some((day) => day.revenue > 0) ? <div className="partner-chart">{analyticsReport.revenueByDay.map((day) => { const max = Math.max(...analyticsReport.revenueByDay.map((entry) => entry.revenue), 1); return <div className="partner-chart__column" key={day.date}><strong>{day.revenue ? formatMoney(day.revenue) : ''}</strong><span style={{ height: `${Math.max((day.revenue / max) * 100, 4)}%` }} /><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</small></div> })}</div> : <EmptyPanel title="Analytics will appear here" detail="There is no real order data in the selected period yet." />}</section>
        <section className="partner-panel"><div className="partner-panel__heading"><div><span className="partner-eyebrow">Menu performance</span><h2>Top food items</h2></div></div>{analyticsReport.topFoods?.some((food) => food.quantity > 0) ? analyticsReport.topFoods.filter((food) => food.quantity > 0).map((food) => <div className="partner-top-food" key={food.foodId}><span>{food.name}</span><strong>{food.quantity} sold</strong><small>{formatMoney(food.revenue)}</small></div>) : <EmptyPanel title="No sales to compare" detail="Top items are calculated from recorded orders." />}</section>
      </> : <div className="partner-loading partner-loading--inline"><span className="partner-spinner" /><p>Loading analytics…</p></div>}
    </>
  )

  const renderReviews = () => <section className="partner-panel"><div className="partner-panel__heading"><div><span className="partner-eyebrow">Customer feedback</span><h2>Reviews</h2></div></div><EmptyPanel title="Reviews are not enabled yet" detail="This project does not have a customer review model or review API. No sample ratings are shown." /></section>

  const renderEarnings = () => (
    <section className="partner-panel">
      <div className="partner-panel__heading"><div><span className="partner-eyebrow">Revenue & transfers</span><h2>Earnings</h2><p>Delivered-order revenue and online payout status.</p></div></div>
      {reportPage === 'earnings' ? <>
        <div className="partner-earnings-total"><span>Completed order revenue</span><strong>{formatMoney(report.completedEarnings)}</strong></div>
        <div className="partner-notice">
          {report.payoutIntegrationAvailable
            ? report.payoutProductStatus === 'activated'
              ? 'Route is connected. Transfers are initiated after successful online payment and Razorpay’s linked-account cooling period. A Created transfer is not yet confirmed as settled to your bank.'
              : `Your Razorpay Route account is ${report.payoutProductStatus || report.payoutAccountStatus || 'under review'}. Transfers begin after activation.`
            : <>Connect a bank account in Settings to receive eligible online-order payouts. <button className="partner-text-link partner-button--link" type="button" onClick={() => go('settings')}>Open Settings</button></>}
        </div>
        <div className="partner-panel__heading partner-panel__heading--compact"><div><span className="partner-eyebrow">Online order transfers</span><h3>Payout activity</h3></div></div>
        {report.payoutIntegrationAvailable && <div className="partner-payout-retry"><span>Only payouts without a confirmed transfer can be retried. Transfers needing manual review are not resent.</span><button className="partner-button partner-button--secondary" type="button" onClick={processPendingPayouts} disabled={payoutProcessing}>{payoutProcessing ? 'Checking…' : 'Check eligible payouts'}</button></div>}
        {report.payouts?.length ? (
          <div className="partner-earnings-list partner-payout-list">
            {report.payouts.map((entry) => (
              <div key={entry.orderId}>
                <span>
                  Order #{String(entry.orderId).slice(-7).toUpperCase()} · {formatDate(entry.date)}
                  <small> · {entry.feeAmount == null ? 'Fee pending' : `Razorpay fees/tax ${formatMoneyExact(entry.feeAmount)}`}</small>
                </span>
                <strong>{entry.amount == null ? entry.status : `${formatMoneyExact(entry.amount)} · ${entry.status}`}</strong>
              </div>
            ))}
          </div>
        ) : <EmptyPanel title="No online payouts yet" detail="Successful online orders will appear here with their transfer status." />}
        {report.earnings?.length ? <div className="partner-earnings-list">{report.earnings.map((entry) => <div key={entry.orderId}><span>Order #{String(entry.orderId).slice(-7).toUpperCase()} · {formatDate(entry.date)}</span><strong>{formatMoney(entry.amount)}</strong></div>)}</div> : <EmptyPanel title="No completed earnings yet" detail="A delivered order will appear here when your order history contains one." />}
      </> : <div className="partner-loading partner-loading--inline"><span className="partner-spinner" /><p>Loading earnings…</p></div>}
    </section>
  )

  const renderSettings = () => (
    <section className="partner-panel partner-panel--form">
      <div className="partner-panel__heading"><div><span className="partner-eyebrow">Account & preferences</span><h2>Settings</h2></div></div>
      <div className="partner-settings-links">
        <button type="button" onClick={() => go('restaurant')}><PartnerIcon name="store" /><span><strong>Restaurant details</strong><small>Business information, contact and address</small></span><PartnerIcon name="arrow" /></button>
        <button type="button" onClick={logout}><PartnerIcon name="logout" /><span><strong>Log out</strong><small>End your food partner session</small></span><PartnerIcon name="arrow" /></button>
      </div>
      <div className="partner-payout-setup">
        <div className="partner-panel__heading"><div><span className="partner-eyebrow">Razorpay Route</span><h2>Bank payouts</h2><p>Set up a linked payout account to receive online-order earnings.</p></div></div>
        {!payoutAccountLoaded ? <div className="partner-loading partner-loading--inline"><span className="partner-spinner" /><p>Loading payout account…</p></div> : payoutAccount?.connected ? (
          <div className="partner-payout-account">
            <strong>Bank account ending in {payoutAccount.bankLast4}</strong>
            <span>Onboarding: {payoutAccount.onboardingStatus}</span>
            <span>Route activation: {payoutAccount.productStatus || 'Waiting for Razorpay'}</span>
            <p>Bank details are managed by Razorpay. To change this payout account, contact support.</p>
          </div>
        ) : payoutAccount?.onboardingStatus === 'Needs Review' || payoutAccount?.onboardingStatus === 'Creating' ? (
          <div className="partner-notice">Your account setup needs confirmation from Razorpay. Do not submit the bank details again; contact support to reconcile the request.</div>
        ) : (
          <>
            <div className="partner-notice">Provide the legal and bank details requested by Razorpay. This app does not save your PAN or full bank account number. There is no platform commission; actual Razorpay gateway fees and tax are deducted from transfers. Razorpay may require additional KYC verification before transfers can settle.</div>
            <form className="partner-form" onSubmit={setupPayoutAccount}>
              <label>Legal name on PAN<input name="legalBusinessName" required minLength={4} maxLength={200} defaultValue={partner.contactName || ''} autoComplete="name" /></label>
              <label>Business type<select name="businessType" defaultValue="individual" required><option value="individual">Individual</option><option value="proprietorship">Proprietorship</option><option value="partnership">Partnership</option><option value="private_limited">Private limited</option><option value="public_limited">Public limited</option><option value="llp">LLP</option><option value="ngo">NGO</option><option value="trust">Trust</option><option value="society">Society</option><option value="other">Other</option><option value="not_yet_registered">Not yet registered</option><option value="educational_institutes">Educational institute</option></select></label>
              <label>PAN<input name="pan" required minLength={10} maxLength={10} pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" autoComplete="off" /></label>
              <label>GSTIN (optional)<input name="gst" maxLength={15} autoComplete="off" /></label>
              <label>Bank account number<input name="accountNumber" type="password" required minLength={9} maxLength={18} inputMode="numeric" pattern="[0-9]{9,18}" autoComplete="new-password" /></label>
              <label>Account holder name<input name="beneficiaryName" required maxLength={100} autoComplete="off" /></label>
              <label>IFSC code<input name="ifsc" required minLength={11} maxLength={11} pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" autoComplete="off" /></label>
              <label className="partner-form__checkbox"><input name="tncAccepted" type="checkbox" required />I confirm that the details are accurate and accept the Razorpay Route terms.</label>
              <div className="partner-form__actions"><button className="partner-button partner-button--primary" type="submit" disabled={payoutSaving}>{payoutSaving ? 'Submitting…' : 'Connect payout account'}</button></div>
            </form>
          </>
        )}
      </div>
    </section>
  )

  let content
  if (page === 'overview') content = renderOverview()
  else if (page === 'restaurant') content = renderRestaurant()
  else if (page === 'foods') content = renderFoodItems()
  else if (page === 'reels') content = renderFoodItems(true)
  else if (page === 'new-reel') content = renderNewReel()
  else if (page === 'orders') content = renderOrders()
  else if (page === 'analytics') content = renderAnalytics()
  else if (page === 'reviews') content = renderReviews()
  else if (page === 'earnings') content = renderEarnings()
  else if (page === 'settings') content = renderSettings()
  else content = renderOverview()

  return (
    <main className="partner-dashboard">
      <aside className="partner-sidebar">
        <Link className="partner-brand" to="/"><span className="partner-brand__mark">IZ</span><span><strong>Insta-Zomato</strong><small>Food Partner</small></span></Link>
        <nav className="partner-sidebar__nav" aria-label="Partner dashboard">
          {NAV_ITEMS.map((item) => <Link key={item.id} to={`${rootPath}${item.id === 'overview' ? '' : `/${item.id}`}`} className={page === item.id || (item.id === 'reels' && page === 'new-reel') ? 'is-active' : ''}><PartnerIcon name={item.icon} /><span>{item.label}</span></Link>)}
        </nav>
        <button className="partner-sidebar__logout" type="button" onClick={logout}><PartnerIcon name="logout" /> Log out</button>
      </aside>

      <div className="partner-main">
        <header className="partner-topbar">
          <div><span className="partner-topbar__mobile-brand">Insta-Zomato Partner</span><h1>{pageLabel}</h1></div>
          <div className="partner-topbar__identity"><span className="partner-avatar">{partner.profileImage ? <img src={partner.profileImage} alt="" /> : (partner.businessName || 'R').trim().charAt(0).toUpperCase()}</span><span><strong>{partner.businessName || 'Restaurant'}</strong><small>Food partner</small></span></div>
        </header>
        <div className="partner-content">{content}</div>
        <nav className="partner-mobile-nav" aria-label="Partner dashboard navigation">{NAV_ITEMS.map((item) => <Link key={item.id} to={`${rootPath}${item.id === 'overview' ? '' : `/${item.id}`}`} className={page === item.id ? 'is-active' : ''}><PartnerIcon name={item.icon} /><span>{item.label === 'Dashboard' ? 'Home' : item.label}</span></Link>)}</nav>
      </div>

      {foodEditor && <div className="partner-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFoodEditor(null) }}><section className="partner-modal" role="dialog" aria-modal="true" aria-labelledby="food-edit-title"><div className="partner-modal__heading"><h2 id="food-edit-title">Edit food item</h2><button type="button" onClick={() => setFoodEditor(null)} aria-label="Close"><PartnerIcon name="close" /></button></div><form className="partner-form" onSubmit={saveFoodEdit}><label>Food title<input name="name" required maxLength={120} defaultValue={foodEditor.name} /></label><label>Category<input name="category" maxLength={80} defaultValue={foodEditor.category || ''} /></label><label>Price (INR)<input name="price" type="number" required min="0.01" max="1000000" step="0.01" defaultValue={foodEditor.price || ''} /></label><label>Partner-provided rating<input name="rating" type="number" required min="1" max="5" step="0.1" defaultValue={foodEditor.rating || ''} /><small>Not a customer review score.</small></label><label className="partner-form__wide">Description<textarea name="description" rows="3" maxLength="500" defaultValue={foodEditor.description || ''} /></label><label>Status<select name="status" defaultValue={foodEditor.status || 'Published'}><option>Published</option><option>Draft</option></select></label><div className="partner-form__actions"><button className="partner-button partner-button--primary" disabled={foodSaving}>{foodSaving ? 'Saving…' : 'Save item'}</button><button className="partner-button partner-button--secondary" type="button" onClick={() => setFoodEditor(null)}>Cancel</button></div></form></section></div>}
    </main>
  )
}

export default FoodPartnerDashboard
