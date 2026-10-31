import {
  ArrowRight,
  BadgeCheck,
  Bike,
  ChefHat,
  ClipboardCheck,
  SearchX,
  Sparkles,
  Star,
  Timer,
  UtensilsCrossed,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CategoryChips } from '../components/CategoryChips.jsx';
import { EmptyState, ErrorState, LoadingCards, Spinner } from '../components/Feedback.jsx';
import { FoodCard } from '../components/FoodCard.jsx';
import { RestaurantCard } from '../components/RestaurantCard.jsx';
import { SearchBar } from '../components/SearchBar.jsx';
import { SmartImage } from '../components/SmartImage.jsx';
import { useAddToCart } from '../hooks/useAddToCart.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../services/api.js';
import { formatClockTime, formatCurrency } from '../utils/format.js';

const EMPTY_SEARCH = { loading: false, error: '', restaurants: [], foods: [] };

export function Home() {
  usePageTitle('');
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const [searchInput, setSearchInput] = useState(query);
  const [landing, setLanding] = useState({ restaurants: [], categories: [] });
  const [landingLoading, setLandingLoading] = useState(true);
  const [landingError, setLandingError] = useState('');
  const [search, setSearch] = useState(EMPTY_SEARCH);
  const [searchNonce, setSearchNonce] = useState(0);
  const resultsRef = useRef(null);
  const { addingId, addToCart } = useAddToCart();

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const loadLanding = useCallback(async (signal) => {
    setLandingLoading(true);
    setLandingError('');
    try {
      const [restaurantData, categoryData] = await Promise.all([
        api.get('/restaurants?limit=20', { signal }),
        api.get('/categories', { signal }),
      ]);
      setLanding({
        restaurants: restaurantData.restaurants,
        categories: categoryData.categories,
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        setLandingError(error.message || 'Could not load restaurants.');
      }
    } finally {
      if (!signal?.aborted) setLandingLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadLanding(controller.signal);
    return () => controller.abort();
  }, [loadLanding]);

  useEffect(() => {
    if (!query) {
      setSearch(EMPTY_SEARCH);
      return undefined;
    }

    const controller = new AbortController();
    setSearch((current) => ({ ...current, loading: true, error: '' }));
    api
      .get(`/search?q=${encodeURIComponent(query)}&limit=12`, { signal: controller.signal })
      .then((data) => {
        setSearch({
          loading: false,
          error: '',
          restaurants: data.restaurants || [],
          foods: data.foods || [],
        });
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setSearch({
            loading: false,
            error: error.message || 'Search is unavailable right now.',
            restaurants: [],
            foods: [],
          });
        }
      });

    return () => controller.abort();
  }, [query, searchNonce]);

  const featured = landing.restaurants[0] || null;

  const searchSummary = useMemo(() => {
    if (!query) return '';
    const total = search.restaurants.length + search.foods.length;
    if (search.loading) return 'Searching the menu…';
    return `${total} result${total === 1 ? '' : 's'} for “${query}”`;
  }, [query, search]);

  function runSearch(value) {
    const next = value.trim();
    if (next) {
      setSearchParams({ q: next });
      window.requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      setSearchParams({});
    }
  }

  function selectCategory(category) {
    runSearch(category);
  }

  return (
    <>
      <section className="relative overflow-hidden pb-10 pt-10 sm:pt-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 top-40 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl" />
        <div className="page-shell relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-rise">
            <p className="eyebrow inline-flex items-center gap-2">
              <Sparkles size={14} /> Fresh from the neighbourhood
            </p>
            <h1 className="mt-4 max-w-2xl font-display text-5xl font-bold leading-[1.06] tracking-tight text-ink-950 sm:text-6xl">
              Good food,
              <br />
              without the <span className="text-brand-600">runaround.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink-500">
              Browse a hand-picked set of kitchens, build a cart from one restaurant at a time, and
              follow your order from the pan to your door — with live status updates every few
              seconds.
            </p>

            <div className="mt-7 max-w-xl">
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                onSubmit={runSearch}
                onClear={() => runSearch('')}
                size="lg"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-ink-700">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck size={15} className="text-brand-500" /> 5 curated kitchens
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Timer size={15} className="text-brand-500" /> 24–34 min delivery
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bike size={15} className="text-brand-500" /> Cash on Delivery
              </span>
            </div>
          </div>

          <div className="relative hidden min-h-[24rem] lg:block">
            {featured ? (
              <div className="relative ml-auto w-[88%]">
                <div className="absolute -left-8 top-10 h-40 w-40 rounded-[2rem] bg-brand-100/80" />
                <SmartImage
                  src={featured.imageUrl}
                  alt={featured.name}
                  eager
                  className="relative ml-auto h-[24rem] w-full rounded-[2.25rem] shadow-[0_40px_80px_-50px_rgba(80,39,20,0.7)]"
                />
                <div className="absolute -bottom-5 -left-4 w-56 rounded-2xl border border-black/5 bg-white p-4 shadow-xl">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <UtensilsCrossed size={17} />
                    </span>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-500">
                        Most loved today
                      </p>
                      <p className="text-sm font-extrabold text-ink-950">{featured.name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-bold text-ink-700">
                    <span className="inline-flex items-center gap-1">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {featured.rating.toFixed(1)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Bike size={12} className="text-brand-500" />
                      {formatCurrency(featured.deliveryFeePaise)}
                    </span>
                    <span className={featured.isOpen ? 'text-emerald-600' : 'text-red-500'}>
                      {featured.isOpen ? 'Open' : `Opens ${formatClockTime(featured.openingTime)}`}
                    </span>
                  </div>
                  <Link
                    to={`/restaurants/${featured.id}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-brand-600 hover:underline"
                  >
                    Explore menu <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="absolute -right-3 top-8 rotate-3 rounded-2xl bg-ink-950 px-4 py-3 text-white shadow-xl">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/60">
                    Now delivering
                  </p>
                  <p className="mt-0.5 text-sm font-extrabold">In 24–34 minutes</p>
                </div>
              </div>
            ) : (
              <div className="ml-auto h-[24rem] w-[88%] animate-pulse rounded-[2.25rem] bg-white/70" />
            )}
          </div>
        </div>
      </section>

      <section className="page-shell pb-2">
        <div className="flex flex-col gap-4 rounded-3xl border border-black/5 bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="shrink-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink-500">
              Browse by craving
            </p>
          </div>
          <div className="min-w-0 flex-1 sm:pl-2">
            {landingLoading && landing.categories.length === 0 ? (
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={index} className="h-9 w-24 animate-pulse rounded-full bg-stone-100" />
                ))}
              </div>
            ) : (
              <CategoryChips
                categories={landing.categories}
                active={query}
                onSelect={selectCategory}
              />
            )}
          </div>
        </div>
      </section>

      <section ref={resultsRef} className="page-shell scroll-mt-24 py-10">
        {query ? (
          <div className="animate-rise">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Search</p>
                <h2 className="mt-1 font-display text-3xl font-bold text-ink-950">
                  {search.loading ? 'Finding something good…' : `Results for “${query}”`}
                </h2>
                <p className="mt-1 text-sm font-semibold text-ink-500">{searchSummary}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  runSearch('');
                }}
                className="btn-secondary !px-4 !py-2.5"
              >
                Clear search
              </button>
            </div>

            {search.loading ? (
              <div className="mt-6 flex items-center justify-center gap-3 py-16 text-sm font-semibold text-ink-500">
                <Spinner className="h-6 w-6 text-brand-500" /> Searching restaurants and dishes…
              </div>
            ) : search.error ? (
              <div className="mt-6">
                <ErrorState
                  title="Search did not complete"
                  message={search.error}
                  onRetry={() => setSearchNonce((value) => value + 1)}
                />
              </div>
            ) : search.restaurants.length === 0 && search.foods.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={SearchX}
                  title="No matches for that craving"
                  description="Try a different dish, cuisine, or restaurant name. You can also browse every kitchen below by clearing the search."
                  action={
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setSearchInput('');
                        runSearch('');
                      }}
                    >
                      Show all restaurants
                    </button>
                  }
                />
              </div>
            ) : (
              <div className="mt-8 space-y-10">
                {search.restaurants.length > 0 ? (
                  <div>
                    <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-ink-700">
                      Restaurants
                    </h3>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      {search.restaurants.map((restaurant, index) => (
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          eager={index < 4}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {search.foods.length > 0 ? (
                  <div>
                    <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.14em] text-ink-700">
                      Dishes
                    </h3>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                      {search.foods.map((food) => (
                        <FoodCard
                          key={food.id}
                          food={food}
                          showRestaurant
                          restaurantOpen={food.restaurant?.isOpen ?? true}
                          busy={addingId === food.id}
                          onAdd={addToCart}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Curated kitchens</p>
                <h2 className="mt-1 font-display text-3xl font-bold text-ink-950">
                  Neighbourhood favourites
                </h2>
                <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-500">
                  Five kitchens, each with its own personality and opening hours. Closed kitchens
                  are still browsable — you just can&apos;t order from them until they open.
                </p>
              </div>
              <p className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold text-ink-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Availability updates from stored opening hours
              </p>
            </div>

            <div className="mt-6">
              {landingLoading ? (
                <LoadingCards count={5} />
              ) : landingError ? (
                <ErrorState
                  title="The kitchens are out of reach"
                  message={landingError}
                  onRetry={() => void loadLanding()}
                />
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {landing.restaurants.map((restaurant, index) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      eager={index < 5}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: UtensilsCrossed,
                  title: 'One kitchen at a time',
                  text: 'A cart can hold dishes from a single restaurant. If you switch, we ask before clearing the old cart.',
                },
                {
                  icon: ChefHat,
                  title: 'A kitchen you can follow',
                  text: 'Orders move from pending to delivered through five visible stages, with a Cassandra-backed event timeline.',
                },
                {
                  icon: ClipboardCheck,
                  title: 'No surprises at checkout',
                  text: 'Prices and availability are validated on the server using the current menu, right before your order is created.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="surface p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-4 font-display text-xl font-bold text-ink-950">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-ink-500">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </>
  );
}
