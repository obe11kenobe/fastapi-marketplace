import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
})

const tickerLabels = [
  'лента fastapi',
  'безумная витрина',
  'локальная корзина',
  'node powered',
  'пульс каталога',
]

const healthLabels = {
  online: 'онлайн',
  syncing: 'синхронизация',
  refreshing: 'обновление',
  unstable: 'нестабильно',
  offline: 'офлайн',
}

function formatMoney(value) {
  return moneyFormatter.format(Number.isFinite(value) ? value : 0)
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return ''
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  return `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
}

function readCart(storageKey) {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const saved = window.localStorage.getItem(storageKey)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function usePersistentCart(storageKey) {
  const [cart, setCart] = useState(() => readCart(storageKey))

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(cart))
  }, [cart, storageKey])

  return [cart, setCart]
}

async function getJson(path, signal) {
  const response = await fetch(`${API_BASE_URL}${path}`, { signal })

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`

    try {
      const payload = await response.json()
      if (payload?.detail) {
        detail =
          typeof payload.detail === 'string'
            ? payload.detail
            : JSON.stringify(payload.detail)
      }
    } catch {
      // Keep HTTP status text when body is not JSON.
    }

    throw new Error(detail)
  }

  return response.json()
}

function ProductCard({
  product,
  quantity,
  index,
  onAdd,
  onIncrement,
  onDecrement,
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const imageUrl = imageFailed ? '' : resolveImageUrl(product.image_url)
  const toneIndex = (product.category_id ?? product.id ?? index) % 4
  const safeCategoryName = product.category?.name ?? 'Без категории'

  return (
    <article
      className={`product-card tone-${toneIndex}`}
      style={{ '--delay': `${index * 75}ms` }}
    >
      <div className="product-topline">
        <span className="product-chip">#{String(product.id).padStart(2, '0')}</span>
        <span className="product-chip product-chip-muted">{safeCategoryName}</span>
      </div>

      <div className={`image-shell ${imageUrl ? 'has-image' : ''}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="image-fallback">
            <span className="fallback-price">{formatMoney(product.price)}</span>
            <span className="fallback-caption">изображение скоро будет</span>
          </div>
        )}
      </div>

      <div className="product-body">
        <div className="product-copy">
              <h3>{product.name}</h3>
              <p>
                {product.description?.trim() ||
              'Описание пока не добавлено, но витрина уже готова.'}
              </p>
        </div>

        <div className="product-meta">
          <strong>{formatMoney(product.price)}</strong>
          <span>{product.created_at?.slice(0, 10) ?? 'новое поступление'}</span>
        </div>

        <div className="product-actions">
          <button className="solid-button" type="button" onClick={() => onAdd(product)}>
            В корзину
          </button>

          <div className="quantity-controls">
            <button type="button" onClick={() => onDecrement(product.id)}>
              -
            </button>
            <span>{quantity}</span>
            <button type="button" onClick={() => onIncrement(product.id)}>
              +
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

function App() {
  const [catalogState, setCatalogState] = useState({
    loading: true,
    error: '',
    health: 'syncing',
    categories: [],
    products: [],
    total: 0,
    lastSyncLabel: 'запуск',
  })
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [refreshToken, setRefreshToken] = useState(0)
  const deferredSearch = useDeferredValue(search)
  const [cart, setCart] = usePersistentCart('shock-shop-cart')

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function loadStorefront() {
      setCatalogState((current) => ({
        ...current,
        loading: true,
        error: '',
        health: current.health === 'online' ? 'refreshing' : 'syncing',
      }))

      try {
        const [healthPayload, categoriesPayload, productsPayload] = await Promise.all([
          getJson('/health', controller.signal),
          getJson('/api/category', controller.signal),
          getJson('/api/product', controller.signal),
        ])

        if (cancelled) {
          return
        }

        const categories = Array.isArray(categoriesPayload) ? categoriesPayload : []
        const products = Array.isArray(productsPayload?.products)
          ? productsPayload.products
          : []

        setCatalogState({
          loading: false,
          error: '',
          health: healthPayload?.status === 'healthy' ? 'online' : 'unstable',
          categories,
          products,
          total: Number.isFinite(productsPayload?.total)
            ? productsPayload.total
            : products.length,
          lastSyncLabel: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return
        }

        setCatalogState((current) => ({
          ...current,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Бэкенд вернул нечитаемый ответ.',
          health: 'offline',
          lastSyncLabel: 'ошибка синхронизации',
        }))
      }
    }

    void loadStorefront()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [refreshToken])

  const { loading, error, health, categories, products, total, lastSyncLabel } =
    catalogState
  const healthLabel = healthLabels[health] ?? health

  const normalizedSearch = deferredSearch.trim().toLowerCase()
  const activeCategoryLabel =
    activeCategory === 'all'
      ? 'Все разделы'
      : categories.find((category) => String(category.id) === activeCategory)?.name ??
        'Выбранный раздел'

  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === 'all' || String(product.category_id) === activeCategory

    const haystack = [
      product.name,
      product.description,
      product.category?.name,
      product.category?.slug,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch)

    return matchesCategory && matchesSearch
  })

  const highlightProduct = visibleProducts[0] ?? products[0] ?? null

  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((item) => String(item.id) === productId)

      if (!product) {
        return null
      }

      return {
        product,
        quantity,
        subtotal: product.price * quantity,
      }
    })
    .filter(Boolean)

  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
  const missingCartEntries = Object.keys(cart).length - cartItems.length

  function bumpCart(productId, nextQuantity) {
    setCart((current) => {
      const updated = { ...current }

      if (nextQuantity <= 0) {
        delete updated[productId]
        return updated
      }

      updated[productId] = nextQuantity
      return updated
    })
  }

  function handleAdd(product) {
    bumpCart(String(product.id), (cart[String(product.id)] ?? 0) + 1)
  }

  function handleRefresh() {
    startTransition(() => {
      setRefreshToken((value) => value + 1)
    })
  }

  function handleSearchChange(event) {
    const nextValue = event.target.value
    startTransition(() => {
      setSearch(nextValue)
    })
  }

  function handleCategoryChange(categoryId) {
    startTransition(() => {
      setActiveCategory(categoryId)
    })
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="topbar reveal">
        <div className="brand-lockup">
          <span className="brand-pill">node.js фронтенд</span>
          <div>
            <p className="micro-label">Shock Shop</p>
            <h1>Покупай быстро. Выгляди громко.</h1>
          </div>
        </div>

        <div className="header-actions">
          <span className={`status-pill status-${health}`}>api {healthLabel}</span>
          <button
            className="ghost-button"
            type="button"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Синхронизация...' : 'Обновить витрину'}
          </button>
          <a
            className="ghost-link"
            href={`${API_BASE_URL}/api/docs`}
            target="_blank"
            rel="noreferrer"
          >
            Открыть docs
          </a>
        </div>
      </header>

      <section className="hero-panel reveal" style={{ '--delay': '80ms' }}>
        <div className="hero-copy">
          <p className="eyebrow">fastapi backend / react витрина / локальная корзина</p>
          <p className="hero-text">
            Это яркая витрина, подключенная к твоему живому API. Категории и товары
            приходят из FastAPI, а корзина пока живет локально в браузере, чтобы
            интерфейс не тормозил, пока серверную корзину не починим.
          </p>

          <div className="hero-actions">
            <button className="solid-button" type="button" onClick={handleRefresh}>
              Жестко обновить
            </button>
            <a className="ghost-link" href="#catalog">
              К каталогу
            </a>
          </div>

          <div className="hero-stats">
            <article>
              <span className="stat-label">Товаров</span>
              <strong>{total}</strong>
            </article>
            <article>
              <span className="stat-label">Категорий</span>
              <strong>{categories.length}</strong>
            </article>
            <article>
              <span className="stat-label">Корзина</span>
              <strong>{cartCount}</strong>
            </article>
            <article>
              <span className="stat-label">Последний sync</span>
              <strong>{lastSyncLabel}</strong>
            </article>
          </div>
        </div>

        <div className="hero-stage">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <article className="signal-card signal-primary">
            <span className="signal-label">Главный сигнал</span>
            <h2>
              {highlightProduct
                ? highlightProduct.name
                : 'Витрина заряжена, но полки пока пустые'}
            </h2>
            <p>
              {highlightProduct
                ? highlightProduct.description || 'Описание для этого товара пока пустое.'
                : 'Бэкенд доступен, но таблица товаров сейчас пустая.'}
            </p>
            <div className="signal-grid">
              <span>{highlightProduct?.category?.name ?? activeCategoryLabel}</span>
              <strong>
                {highlightProduct ? formatMoney(highlightProduct.price) : 'Цены пока нет'}
              </strong>
            </div>
          </article>

          <article className="signal-card signal-secondary">
            <span className="signal-label">Состояние системы</span>
            <ul className="signal-list">
              <li>{health === 'online' ? 'Бэкенд отвечает стабильно.' : 'Бэкенд требует внимания.'}</li>
              <li>Подключено разделов: {categories.length || 0}.</li>
              <li>По текущим фильтрам видно товаров: {visibleProducts.length}.</li>
              <li>Корзина хранится в localStorage браузера.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="ticker-band reveal" style={{ '--delay': '140ms' }}>
        <div className="ticker-track">
          {[...tickerLabels, ...tickerLabels].map((label, index) => (
            <span className="ticker-item" key={`${label}-${index}`}>
              {label}
            </span>
          ))}
        </div>
      </section>

      <main className="dashboard">
        <section className="catalog-column">
          <div className="section-head reveal" style={{ '--delay': '200ms' }} id="catalog">
            <div>
              <p className="micro-label">Каталог</p>
              <h2>Фильтруй хаос</h2>
            </div>

            <label className="search-shell" htmlFor="product-search">
              <span>Поиск</span>
              <input
                id="product-search"
                name="product-search"
                type="search"
                placeholder="Товар, категория или любое слово"
                value={search}
                onChange={handleSearchChange}
              />
            </label>
          </div>

          <div className="chip-row reveal" style={{ '--delay': '240ms' }}>
            <button
              className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
              type="button"
              onClick={() => handleCategoryChange('all')}
            >
              Все разделы
            </button>

            {categories.map((category) => (
              <button
                className={`category-chip ${
                  activeCategory === String(category.id) ? 'active' : ''
                }`}
                type="button"
                key={category.id}
                onClick={() => handleCategoryChange(String(category.id))}
              >
                {category.name}
              </button>
            ))}
          </div>

          {error ? (
            <article className="alert-panel reveal" style={{ '--delay': '280ms' }}>
              <p className="micro-label">Проблема с API</p>
              <h3>Витрина не смогла загрузить данные.</h3>
              <p>{error}</p>
            </article>
          ) : null}

          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <article className="skeleton-card" key={index}>
                  <div className="skeleton-box skeleton-image" />
                  <div className="skeleton-box skeleton-line skeleton-line-wide" />
                  <div className="skeleton-box skeleton-line" />
                  <div className="skeleton-box skeleton-line skeleton-line-short" />
                </article>
              ))}
            </div>
          ) : visibleProducts.length ? (
            <div className="product-grid">
              {visibleProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={cart[String(product.id)] ?? 0}
                  index={index}
                  onAdd={handleAdd}
                  onIncrement={(productId) =>
                    bumpCart(String(productId), (cart[String(productId)] ?? 0) + 1)
                  }
                  onDecrement={(productId) =>
                    bumpCart(String(productId), (cart[String(productId)] ?? 0) - 1)
                  }
                />
              ))}
            </div>
          ) : (
            <section className="empty-panel reveal" style={{ '--delay': '280ms' }}>
              <p className="micro-label">Пустой каталог</p>
              <h3>Фронт живой. Таблица товаров пока нет.</h3>
              <p>
                FastAPI отвечает, но по текущим фильтрам товаров нет. Заполни `shop.db`,
                добавь данные через админку или расширь бэкенд create-эндпоинтами и
                потом обнови витрину.
              </p>
              <div className="empty-actions">
                <button className="solid-button" type="button" onClick={handleRefresh}>
                  Проверить API снова
                </button>
                <a
                  className="ghost-link"
                  href={`${API_BASE_URL}/api/docs`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть FastAPI docs
                </a>
              </div>
            </section>
          )}

          <section className="insight-grid">
            <article className="insight-card reveal" style={{ '--delay': '340ms' }}>
              <p className="micro-label">Выборка</p>
              <h3>{activeCategoryLabel}</h3>
              <p>
                {normalizedSearch
                  ? `Поиск "${normalizedSearch}" применен к текущему каталогу.`
                  : 'Поиск не задан. Ты смотришь на сырой поток данных.'}
              </p>
            </article>

            <article className="insight-card reveal" style={{ '--delay': '400ms' }}>
              <p className="micro-label">Режим работы</p>
              <h3>Как сейчас устроен фронт</h3>
              <p>
                Каталог и категории идут с сервера. Корзина пока живет в браузере,
                чтобы интерфейс оставался удобным, пока cart-маршруты на бэкенде
                еще сыроваты.
              </p>
            </article>
          </section>
        </section>

        <aside className="cart-column">
          <section className="cart-panel reveal" style={{ '--delay': '260ms' }}>
            <div className="cart-header">
              <div>
                <p className="micro-label">Локальная корзина</p>
                <h2>Реактор корзины</h2>
              </div>
              <span className="cart-badge">{cartCount} шт.</span>
            </div>

            <div className="cart-summary">
              <div>
                <span>Сумма</span>
                <strong>{formatMoney(cartSubtotal)}</strong>
              </div>
              <div>
                <span>Позиций</span>
                <strong>{cartItems.length}</strong>
              </div>
            </div>

            {cartItems.length ? (
              <div className="cart-list">
                {cartItems.map(({ product, quantity, subtotal }) => (
                  <article className="cart-item" key={product.id}>
                    <div>
                      <p>{product.name}</p>
                      <span>{product.category?.name ?? 'Без категории'}</span>
                    </div>

                    <div className="cart-item-side">
                      <strong>{formatMoney(subtotal)}</strong>
                      <div className="quantity-controls compact">
                        <button
                          type="button"
                          onClick={() =>
                            bumpCart(String(product.id), (cart[String(product.id)] ?? 0) - 1)
                          }
                        >
                          -
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            bumpCart(String(product.id), (cart[String(product.id)] ?? 0) + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cart-empty">
                <h3>Корзина пока пустая.</h3>
                <p>
                  Нажми на карточку товара, и локальная корзина сразу начнет считать
                  количество.
                </p>
              </div>
            )}

            {missingCartEntries > 0 ? (
              <p className="cart-warning">
                {missingCartEntries} позиций скрыты, потому что этих id товаров нет в
                текущем ответе API.
              </p>
            ) : null}

            <button
              className="ghost-button wide"
              type="button"
              onClick={() => setCart({})}
              disabled={!cartCount}
            >
              Очистить корзину
            </button>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
