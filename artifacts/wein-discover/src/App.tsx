import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowLeft,
  BookOpen,
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Dumbbell,
  Flame,
  Gift,
  Heart,
  House,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Ticket,
  Trash2,
  UserRound,
  UsersRound,
  Utensils,
  Waves,
  X,
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

type Category = 'All' | 'Trending' | 'Tonight' | 'Music' | 'Food' | 'Sports' | 'Social' | 'Free' | 'Learn';
type ItemCategory = 'Food & Drink' | 'Music' | 'Outdoors' | 'Art' | 'Nightlife' | 'Learn';
type Tab = 'Discover' | 'Live' | 'Create' | 'Plans' | 'You';

type DiscoverItem = {
  id: string;
  title: string;
  category: ItemCategory;
  time: string;
  distance: string;
  price: string;
  image: string;
  rating?: string;
  status?: 'OPEN NOW' | 'TRENDING';
  social?: string;
  venue: string;
  description: string;
  tags: Category[];
};

type CustomPlan = {
  id: string;
  title: string;
  place: string;
  date: string;
  time: string;
};

const SAVED_EVENTS_KEY = 'wein:saved-events';
const CUSTOM_PLANS_KEY = 'wein:custom-plans';

const queryClient = new QueryClient();

const categories: { name: Category; icon: typeof Compass }[] = [
  { name: 'All', icon: Compass },
  { name: 'Trending', icon: Flame },
  { name: 'Tonight', icon: Clock3 },
  { name: 'Music', icon: Waves },
  { name: 'Food', icon: Utensils },
  { name: 'Sports', icon: Dumbbell },
  { name: 'Social', icon: UsersRound },
  { name: 'Free', icon: Gift },
  { name: 'Learn', icon: BookOpen },
];

const items: DiscoverItem[] = [
  {
    id: 'night-market',
    title: 'Night Market After Dark',
    category: 'Nightlife',
    time: '8:00 PM',
    distance: '4.2 km',
    price: '$15',
    image: '/images/night-market.jpg',
    rating: '4.6',
    status: 'TRENDING',
    social: '3 friends saved this',
    venue: 'Civic Plaza',
    description: 'Late-night food stalls, local makers, and live sets under the lights.',
    tags: ['Trending', 'Tonight', 'Food', 'Social'],
  },
  {
    id: 'heritage-coffee',
    title: 'Heritage Coffee Crawl',
    category: 'Food & Drink',
    time: '7:30 PM',
    distance: '2.1 km',
    price: 'Free',
    image: '/images/coffee.jpg',
    rating: '4.8',
    social: '12 people are going',
    venue: 'Historic Cloverdale',
    description: 'A relaxed walk between independent cafés with a few tasting stops.',
    tags: ['Tonight', 'Food', 'Social', 'Free'],
  },
  {
    id: 'pixel-night',
    title: 'Pixel Night at Glitch',
    category: 'Nightlife',
    time: '9:00 PM',
    distance: '5.8 km',
    price: '$12',
    image: '/images/arcade.jpg',
    status: 'OPEN NOW',
    social: '8 people are going',
    venue: 'Glitch Arcade Bar',
    description: 'Retro games, casual tournaments, and a lively late-night crowd.',
    tags: ['Tonight', 'Social'],
  },
  {
    id: 'river-sunset',
    title: 'Nicomekl River Sunset Walk',
    category: 'Outdoors',
    time: '6:15 PM',
    distance: '1.8 km',
    price: 'Free',
    image: '/images/park.jpg',
    social: '5 friends saved this',
    venue: 'Nicomekl Riverfront',
    description: 'An easy golden-hour walk beside the river with wide sunset views.',
    tags: ['Tonight', 'Social', 'Free'],
  },
  {
    id: 'sunset-volleyball',
    title: 'Sunset Volleyball',
    category: 'Outdoors',
    time: '6:45 PM',
    distance: '3.6 km',
    price: 'Free',
    image: '/images/park.jpg',
    social: '6 friends are going',
    venue: 'Holland Park',
    description: 'Friendly drop-in volleyball for every skill level. Teams form on arrival.',
    tags: ['Tonight', 'Sports', 'Social', 'Free'],
  },
  {
    id: 'coffee-meet-people',
    title: 'Coffee & Meet People',
    category: 'Food & Drink',
    time: '7:00 PM',
    distance: '2.7 km',
    price: '$5',
    image: '/images/coffee.jpg',
    social: 'A warm table for new faces',
    venue: 'Central City Café',
    description: 'A low-pressure coffee meetup made for meeting someone new.',
    tags: ['Tonight', 'Food', 'Social'],
  },
  {
    id: 'python-night',
    title: 'Beginner Python Night',
    category: 'Learn',
    time: '7:30 PM',
    distance: '4.9 km',
    price: 'Free',
    image: '/images/arcade.jpg',
    social: 'Bring your curiosity',
    venue: 'Surrey Libraries — City Centre',
    description: 'A welcoming beginner workshop covering the first steps in Python.',
    tags: ['Tonight', 'Learn', 'Free'],
  },
  {
    id: 'food-crawl',
    title: 'Downtown Food Crawl',
    category: 'Food & Drink',
    time: '8:30 PM',
    distance: '6.2 km',
    price: '$20',
    image: '/images/coffee.jpg',
    status: 'TRENDING',
    social: '9 people are going',
    venue: 'Downtown Surrey',
    description: 'Taste a hand-picked route of local restaurants in one social evening.',
    tags: ['Trending', 'Tonight', 'Food', 'Social'],
  },
  {
    id: 'late-night-bowling',
    title: 'Late Night Bowling',
    category: 'Nightlife',
    time: '10:00 PM',
    distance: '7.1 km',
    price: '$18',
    image: '/images/arcade.jpg',
    status: 'OPEN NOW',
    social: 'Lane 8 is calling',
    venue: 'Dell Lanes',
    description: 'Glow lanes, music, and an easy late-night game with friends.',
    tags: ['Social'],
  },
  {
    id: 'vinyl-social',
    title: 'Surrey Vinyl Social',
    category: 'Music',
    time: '7:45 PM',
    distance: '3.1 km',
    price: 'Free',
    image: '/images/night-market.jpg',
    status: 'TRENDING',
    social: 'Bring a record or just listen',
    venue: 'The Courtyard Room',
    description: 'Local selectors share favourite records in a relaxed listening room.',
    tags: ['Trending', 'Tonight', 'Music', 'Social', 'Free'],
  },
];

const friends = [
  { initials: 'AR', name: 'Amara', title: 'Heritage Coffee Crawl', image: '/images/coffee.jpg' },
  { initials: 'JM', name: 'Jae + 2', title: 'Pixel Night at Glitch', image: '/images/arcade.jpg' },
  { initials: 'SK', name: 'Suki', title: 'River Sunset Walk', image: '/images/park.jpg' },
];

function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) as T : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Browsing still works when storage is unavailable.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 28 28" role="presentation" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="currentColor" />
      <path
        d="M6.5 8.25 9.7 19.4 14 12.3l4.3 7.1 3.2-11.15"
        fill="none"
        stroke="white"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveButton({
  id,
  saved,
  onToggle,
  compact = false,
}: {
  id: string;
  saved: boolean;
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={saved ? 'Remove saved place' : 'Save place'}
      aria-pressed={saved}
      data-testid={`button-save-${id}`}
      onClick={(event) => {
        event.stopPropagation();
        onToggle(id);
      }}
      className={`save-button ${compact ? 'save-button-compact' : ''} ${saved ? 'is-saved' : ''}`}
    >
      {saved ? <Bookmark size={compact ? 16 : 18} fill="currentColor" /> : <Bookmark size={compact ? 16 : 18} />}
    </button>
  );
}

function MetaRow({ item, light = false }: { item: DiscoverItem; light?: boolean }) {
  return (
    <div className={`meta-row ${light ? 'meta-row-light' : ''}`}>
      <span><Clock3 size={13} /> {item.time}</span>
      <span><MapPin size={13} /> {item.distance}</span>
      <span className="price-meta">{item.price}</span>
      {item.rating && <span><Heart size={12} fill="currentColor" /> {item.rating}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: NonNullable<DiscoverItem['status']> }) {
  return (
    <span className={`status-badge ${status === 'TRENDING' ? 'trending' : 'open'}`}>
      {status === 'TRENDING' ? <Flame size={12} /> : <Check size={12} />}
      {status}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button type="button" onClick={() => onAction?.()} className="text-action" data-testid={`button-section-${title.toLowerCase().replaceAll(' ', '-')}`}>
          {action} <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

function FeatureCard({ saved, onToggle, onOpen }: { saved: boolean; onToggle: (id: string) => void; onOpen: (item: DiscoverItem) => void }) {
  const item = items[0];
  return (
    <article
      className="feature-card interactive-card"
      data-testid="card-feature-night-market"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item);
        }
      }}
    >
      <img src={item.image} alt="Warm lights and food stalls at Night Market After Dark" />
      <div className="feature-scrim" />
      <div className="feature-top">
        <StatusBadge status="TRENDING" />
        <SaveButton id={item.id} saved={saved} onToggle={onToggle} />
      </div>
      <div className="feature-copy">
        <p className="feature-kicker">Tonight in Surrey</p>
        <h1>{item.title}</h1>
        <MetaRow item={item} light />
        <p className="feature-social"><UsersRound size={14} /> {item.social}</p>
        <button type="button" className="feature-cta" onClick={(event) => { event.stopPropagation(); onOpen(item); }} data-testid="button-see-whats-happening">
          View details <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}

function EventCard({
  item,
  saved,
  onToggle,
  onOpen,
  compact = false,
}: {
  item: DiscoverItem;
  saved: boolean;
  onToggle: (id: string) => void;
  onOpen: (item: DiscoverItem) => void;
  compact?: boolean;
}) {
  return (
    <article
      className={`event-card interactive-card ${compact ? 'event-card-compact' : ''}`}
      data-testid={`card-event-${item.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item);
        }
      }}
    >
      <div className="event-image-wrap">
        <img src={item.image} alt="" className="event-image" />
        {item.status && <div className="event-status"><StatusBadge status={item.status} /></div>}
      </div>
      <div className="event-content">
        <div className="event-title-row">
          <div>
            <p className="card-category">{item.category}</p>
            <h3>{item.title}</h3>
          </div>
          <SaveButton id={item.id} saved={saved} onToggle={onToggle} compact />
        </div>
        <MetaRow item={item} />
        {item.social && <p className="event-social"><UsersRound size={13} /> {item.social}</p>}
      </div>
    </article>
  );
}

function EventDetailsDialog({
  item,
  saved,
  onToggle,
  onClose,
}: {
  item: DiscoverItem | null;
  saved: boolean;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="event-dialog" data-testid="dialog-event-details">
        {item && (
          <>
            <img className="event-dialog-image" src={item.image} alt="" />
            <div className="event-dialog-body">
              <DialogHeader>
                <p className="section-eyebrow">{item.category}</p>
                <DialogTitle>{item.title}</DialogTitle>
                <DialogDescription>{item.description}</DialogDescription>
              </DialogHeader>
              <p className="event-dialog-venue"><MapPin size={15} /> {item.venue}</p>
              <MetaRow item={item} />
              {item.social && <p className="event-social"><UsersRound size={13} /> {item.social}</p>}
              <button type="button" className="primary-button event-dialog-action" onClick={() => onToggle(item.id)}>
                <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
                {saved ? 'Remove from plans' : 'Save to plans'}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BottomNav({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  const navItems: { name: Tab; icon: typeof Compass }[] = [
    { name: 'Discover', icon: Compass },
    { name: 'Live', icon: Flame },
    { name: 'Create', icon: Plus },
    { name: 'Plans', icon: Ticket },
    { name: 'You', icon: UserRound },
  ];
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="bottom-nav-inner">
        {navItems.map(({ name, icon: Icon }) => (
          <button
            type="button"
            key={name}
            className={`bottom-tab ${activeTab === name ? 'active' : ''} ${name === 'Create' ? 'create-tab' : ''}`}
            onClick={() => onTabChange(name)}
            aria-current={activeTab === name ? 'page' : undefined}
            data-testid={`button-nav-${name.toLowerCase()}`}
          >
            <span className="nav-icon"><Icon size={name === 'Create' ? 20 : 18} strokeWidth={name === 'Create' ? 2.4 : 1.8} /></span>
            <span>{name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function Header({
  query,
  onQueryChange,
  category,
  onCategoryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  category: Category;
  onCategoryChange: (category: Category) => void;
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  return (
    <header className="discover-header">
      <div className="brand-row">
        <div className="wordmark" aria-label="WEIN, where to next?">
          <BrandMark />
          <span>WEIN</span>
          <span className="arabic-mark" lang="ar">وين</span>
        </div>
        <div className="location-lockup">
          <MapPin size={14} />
          <span>Surrey, BC</span>
        </div>
        <button type="button" className="icon-button notification-button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((current) => !current)} data-testid="button-notifications">
          <Bell size={19} />
          <span className="notification-dot" />
        </button>
      </div>
      {showNotifications && (
        <div className="notification-panel" role="status" data-testid="panel-notifications">
          <strong>Tonight is picking up</strong>
          <span>Night Market After Dark is trending near you.</span>
        </div>
      )}
      <p className="tagline">Where to next?</p>
      <label className="search-box">
        <Search size={18} />
        <span className="sr-only">Search places and events</span>
        <input
          type="search"
          placeholder="Search events, places, people..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          data-testid="input-search-discover"
        />
        {query && (
          <button type="button" className="clear-search" onClick={() => onQueryChange('')} aria-label="Clear search" data-testid="button-clear-search">
            <X size={15} />
          </button>
        )}
      </label>
      <div className="category-scroller hide-scrollbar" aria-label="Browse categories">
        {categories.map(({ name, icon: Icon }) => (
          <button
            type="button"
            key={name}
            className={`category-chip ${category === name ? 'selected' : ''}`}
            onClick={() => onCategoryChange(name)}
            aria-pressed={category === name}
            data-testid={`button-category-${name.toLowerCase().replaceAll(' ', '-')}`}
          >
            <Icon size={14} /> {name}
          </button>
        ))}
      </div>
    </header>
  );
}

function BoredModule() {
  const [, setLocation] = useLocation();
  return (
    <section className="bored-module" data-testid="module-im-bored">
      <div className="bored-stamp"><Sparkles size={18} /><span>NO PLANS?</span></div>
      <div className="bored-copy">
        <h2>Don&apos;t know where?</h2>
        <p className="bored-pick">Let WEIN pick.</p>
        <p className="bored-supporting-copy">Tell us your mood. WEIN will pick the move.</p>
      </div>
      <button type="button" className="bored-button" onClick={() => setLocation('/bored')} data-testid="button-im-bored">
        I&apos;M BORED <ChevronRight size={18} />
      </button>
    </section>
  );
}

function LiveView({ saved, onToggle, onOpen }: { saved: string[]; onToggle: (id: string) => void; onOpen: (item: DiscoverItem) => void }) {
  const liveItems = items.filter((item) => item.status);
  return (
    <main className="tab-page page-enter" data-testid="page-live">
      <div className="tab-hero compact-tab-hero">
        <p className="section-eyebrow">LIVE NEARBY</p>
        <h1>What&apos;s moving now.</h1>
        <p>Open spots and popular plans happening around Surrey.</p>
      </div>
      <div className="event-list tab-event-list">
        {liveItems.map((item) => <EventCard key={item.id} item={item} saved={saved.includes(item.id)} onToggle={onToggle} onOpen={onOpen} />)}
      </div>
    </main>
  );
}

function CreateView({ onCreate }: { onCreate: (plan: CustomPlan) => void }) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const plan: CustomPlan = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `plan-${Date.now()}`,
      title: String(form.get('title') ?? '').trim(),
      place: String(form.get('place') ?? '').trim(),
      date: String(form.get('date') ?? ''),
      time: String(form.get('time') ?? ''),
    };
    if (!plan.title || !plan.place || !plan.date || !plan.time) return;
    onCreate(plan);
    event.currentTarget.reset();
    setSubmitted(true);
  };

  return (
    <main className="tab-page page-enter" data-testid="page-create">
      <div className="tab-hero compact-tab-hero">
        <p className="section-eyebrow">START SOMETHING</p>
        <h1>Make the plan.</h1>
        <p>Add the essentials now. Your plan stays on this device.</p>
      </div>
      <form className="plan-form" onSubmit={handleSubmit} data-testid="form-create-plan">
        <label className="form-field">
          <span>Plan name</span>
          <input name="title" required placeholder="Friday coffee run" />
        </label>
        <label className="form-field">
          <span>Place</span>
          <input name="place" required placeholder="Central City" />
        </label>
        <div className="form-grid">
          <label className="form-field">
            <span>Date</span>
            <input name="date" type="date" required />
          </label>
          <label className="form-field">
            <span>Time</span>
            <input name="time" type="time" required />
          </label>
        </div>
        <button type="submit" className="primary-button plan-submit"><Plus size={17} /> Add to Plans</button>
        {submitted && <p className="form-success" role="status"><Check size={14} /> Plan added.</p>}
      </form>
    </main>
  );
}

function PlansView({
  saved,
  customPlans,
  onToggle,
  onOpen,
  onRemovePlan,
}: {
  saved: string[];
  customPlans: CustomPlan[];
  onToggle: (id: string) => void;
  onOpen: (item: DiscoverItem) => void;
  onRemovePlan: (id: string) => void;
}) {
  const savedItems = items.filter((item) => saved.includes(item.id));
  const hasPlans = savedItems.length > 0 || customPlans.length > 0;
  return (
    <main className="tab-page page-enter" data-testid="page-plans">
      <div className="tab-hero compact-tab-hero">
        <p className="section-eyebrow">YOUR PLANS</p>
        <h1>Ready when you are.</h1>
        <p>Saved finds and plans you created live here.</p>
      </div>
      {!hasPlans ? (
        <div className="empty-results roomy-empty"><Ticket size={24} /><p>No plans saved yet.</p><span>Bookmark an event or create your own plan.</span></div>
      ) : (
        <>
          {savedItems.length > 0 && (
            <section className="plans-section">
              <SectionHeading eyebrow="SAVED" title="From Discover" />
              <div className="event-list">
                {savedItems.map((item) => <EventCard key={item.id} item={item} saved onToggle={onToggle} onOpen={onOpen} />)}
              </div>
            </section>
          )}
          {customPlans.length > 0 && (
            <section className="plans-section">
              <SectionHeading eyebrow="MADE BY YOU" title="Your own plans" />
              <div className="custom-plan-list">
                {customPlans.map((plan) => (
                  <article className="custom-plan-card" key={plan.id}>
                    <div><p className="card-category">{plan.date} · {plan.time}</p><h3>{plan.title}</h3><p><MapPin size={13} /> {plan.place}</p></div>
                    <button type="button" className="remove-plan-button" onClick={() => onRemovePlan(plan.id)} aria-label={`Remove ${plan.title}`}><Trash2 size={16} /></button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function YouView({ savedCount, planCount }: { savedCount: number; planCount: number }) {
  return (
    <main className="tab-page page-enter" data-testid="page-you">
      <div className="profile-card">
        <div className="profile-avatar">MK</div>
        <p className="section-eyebrow">YOUR WEIN</p>
        <h1>Explorer in Surrey.</h1>
        <p>Keep collecting good reasons to leave the group chat.</p>
        <div className="profile-stats"><div><strong>{savedCount}</strong><span>Saved</span></div><div><strong>{planCount}</strong><span>Created</span></div></div>
      </div>
      <p className="profile-note">Account sync and friend invitations are the next product step. For now, this prototype keeps your activity private on this device.</p>
    </main>
  );
}

function Discover() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [saved, setSaved] = useStoredState<string[]>(SAVED_EVENTS_KEY, []);
  const [customPlans, setCustomPlans] = useStoredState<CustomPlan[]>(CUSTOM_PLANS_KEY, []);
  const [activeTab, setActiveTab] = useState<Tab>('Discover');
  const [saveMessage, setSaveMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);
  const [recommendationOffset, setRecommendationOffset] = useState(0);

  const toggleSaved = (id: string) => {
    const isSaved = saved.includes(id);
    setSaved((current) => isSaved ? current.filter((item) => item !== id) : [...current, id]);
    setSaveMessage(isSaved ? 'Removed from your plans' : 'Saved to your plans');
    window.setTimeout(() => setSaveMessage(''), 1800);
  };

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === 'All' || item.tags.includes(category);
      const searchable = `${item.title} ${item.category} ${item.price} ${item.time} ${item.venue} ${item.description} ${item.social ?? ''}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const happening = items.filter((item) => item.tags.includes('Tonight')).slice(1, 3);
  const recommendations = items.filter((item) => ['river-sunset', 'heritage-coffee', 'sunset-volleyball', 'vinyl-social'].includes(item.id));
  const forYou = [recommendations[recommendationOffset % recommendations.length], recommendations[(recommendationOffset + 1) % recommendations.length]];
  const openNow = items.filter((item) => item.status === 'OPEN NOW');
  const freeThisWeek = items.filter((item) => item.price === 'Free').slice(0, 3);
  const isFiltering = query.trim().length > 0 || category !== 'All';

  const openItem = (item: DiscoverItem) => setSelectedItem(item);
  const addPlan = (plan: CustomPlan) => {
    setCustomPlans((current) => [plan, ...current]);
    setSaveMessage('Added to your plans');
    window.setTimeout(() => setSaveMessage(''), 1800);
    setActiveTab('Plans');
  };

  return (
    <div className="wein-shell grain">
      <div className="app-content">
        <Header query={query} onQueryChange={setQuery} category={category} onCategoryChange={setCategory} />
        {activeTab === 'Discover' ? (
          <main className="discover-main page-enter">
            {isFiltering ? (
              <section className="content-section filter-results" data-testid="section-filter-results">
                <SectionHeading eyebrow={`${filteredItems.length} ${filteredItems.length === 1 ? 'MATCH' : 'MATCHES'}`} title={query.trim() ? `Results for “${query.trim()}”` : category} action="Clear" onAction={() => { setQuery(''); setCategory('All'); }} />
                {filteredItems.length > 0 ? (
                  <div className="event-list">
                    {filteredItems.map((item) => <EventCard key={item.id} item={item} saved={saved.includes(item.id)} onToggle={toggleSaved} onOpen={openItem} />)}
                  </div>
                ) : <EmptyResults query={query} />}
              </section>
            ) : (
              <>
            <FeatureCard saved={saved.includes('night-market')} onToggle={toggleSaved} onOpen={openItem} />

            <section className="content-section" id="happening-tonight">
              <SectionHeading eyebrow="RIGHT NOW" title="Happening tonight" action="See all" onAction={() => setCategory('Tonight')} />
              {happening.length > 0 ? (
                <div className="event-list">
                  {happening.map((item) => <EventCard key={item.id} item={item} saved={saved.includes(item.id)} onToggle={toggleSaved} onOpen={openItem} />)}
                </div>
              ) : (
                <EmptyResults query={query} />
              )}
            </section>

            <section className="content-section friends-section">
              <SectionHeading eyebrow="YOUR PEOPLE" title="Friends are going" action="See all" onAction={() => document.querySelector('.friends-scroller')?.scrollTo({ left: 0, behavior: 'smooth' })} />
              <div className="friends-scroller hide-scrollbar">
                {friends.map((friend) => (
                  <article className="friend-card interactive-card" key={friend.initials} data-testid={`card-friend-${friend.initials.toLowerCase()}`} role="button" tabIndex={0} onClick={() => { const match = items.find((item) => item.title.includes(friend.title.replace('River Sunset Walk', 'Nicomekl River Sunset Walk'))); if (match) openItem(match); }}>
                    <div className="friend-image-wrap">
                      <img src={friend.image} alt="" />
                      <span className="friend-avatar">{friend.initials}</span>
                    </div>
                    <p className="friend-name">{friend.name}</p>
                    <p className="friend-plan">{friend.title}</p>
                  </article>
                ))}
              </div>
            </section>

            <BoredModule />

            <section className="content-section">
              <SectionHeading eyebrow="PICKED FOR YOU" title="For you" action="Refresh" onAction={() => setRecommendationOffset((current) => current + 1)} />
              {forYou.length > 0 ? (
                <div className="event-list">
                  {forYou.map((item) => <EventCard key={`for-${item.id}`} item={item} saved={saved.includes(item.id)} onToggle={toggleSaved} onOpen={openItem} />)}
                </div>
              ) : <EmptyResults query={query} />}
            </section>

            <section className="content-section split-section">
              <div>
                <SectionHeading eyebrow="OPEN" title="Open right now" />
                {openNow.length > 0 ? openNow.map((item) => <EventCard key={`open-${item.id}`} item={item} compact saved={saved.includes(item.id)} onToggle={toggleSaved} onOpen={openItem} />) : <p className="muted-note">Nothing open matches that filter.</p>}
              </div>
              <div>
                <SectionHeading eyebrow="NO TICKET NEEDED" title="Free this week" />
                {freeThisWeek.length > 0 ? freeThisWeek.map((item) => <EventCard key={`free-${item.id}`} item={item} compact saved={saved.includes(item.id)} onToggle={toggleSaved} onOpen={openItem} />) : <p className="muted-note">Try All for more free finds.</p>}
              </div>
            </section>

            <p className="demo-note">Demo places for Surrey, BC · details are for exploring WEIN</p>
              </>
            )}
          </main>
        ) : activeTab === 'Live' ? (
          <LiveView saved={saved} onToggle={toggleSaved} onOpen={openItem} />
        ) : activeTab === 'Create' ? (
          <CreateView onCreate={addPlan} />
        ) : activeTab === 'Plans' ? (
          <PlansView saved={saved} customPlans={customPlans} onToggle={toggleSaved} onOpen={openItem} onRemovePlan={(id) => setCustomPlans((current) => current.filter((plan) => plan.id !== id))} />
        ) : (
          <YouView savedCount={saved.length} planCount={customPlans.length} />
        )}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        {saveMessage && <div className="save-toast" role="status" data-testid="status-save-feedback"><Check size={15} /> {saveMessage}</div>}
        <EventDetailsDialog item={selectedItem} saved={selectedItem ? saved.includes(selectedItem.id) : false} onToggle={toggleSaved} onClose={() => setSelectedItem(null)} />
      </div>
    </div>
  );
}

function EmptyResults({ query }: { query: string }) {
  return (
    <div className="empty-results" data-testid="empty-search-results">
      <Search size={22} />
      <p>{query ? `No finds for “${query}” yet.` : 'Nothing in this lane just yet.'}</p>
      <span>Try another category or search nearby.</span>
    </div>
  );
}

function Bored() {
  const [, setLocation] = useLocation();
  const [mood, setMood] = useState<'Anything' | 'Food' | 'Active' | 'Social' | 'Free'>('Anything');
  const [pickIndex, setPickIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);
  const [saved, setSaved] = useStoredState<string[]>(SAVED_EVENTS_KEY, []);
  const matches = useMemo(() => items.filter((item) => {
    if (mood === 'Anything') return true;
    if (mood === 'Active') return item.tags.includes('Sports') || item.category === 'Outdoors';
    return item.tags.includes(mood as Category);
  }), [mood]);
  const suggestion = matches[pickIndex % matches.length];
  const toggleSaved = (id: string) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div className="wein-shell grain">
      <main className="bored-page page-enter" data-testid="page-bored">
        <button type="button" className="back-link" onClick={() => setLocation('/')} data-testid="button-bored-back">
          <ArrowLeft size={17} /> Discover
        </button>
        <div className="bored-page-mark"><Sparkles size={30} /></div>
        <p className="section-eyebrow">LET WEIN PICK</p>
        <h1>What are you feeling?</h1>
        <p className="bored-page-copy">Choose a mood and we&apos;ll hand you one solid move nearby.</p>
        <div className="bored-moods" aria-label="Choose a mood">
          {(['Anything', 'Food', 'Active', 'Social', 'Free'] as const).map((option) => (
            <button key={option} type="button" className={`category-chip ${mood === option ? 'selected' : ''}`} aria-pressed={mood === option} onClick={() => { setMood(option); setPickIndex(0); }}>{option}</button>
          ))}
        </div>
        <div className="bored-result">
          <EventCard item={suggestion} saved={saved.includes(suggestion.id)} onToggle={toggleSaved} onOpen={setSelectedItem} />
        </div>
        <div className="bored-actions">
          <button type="button" className="primary-button" onClick={() => setPickIndex((current) => current + 1)} data-testid="button-pick-again"><Sparkles size={16} /> Pick another</button>
          <button type="button" className="outline-button" onClick={() => setLocation('/')} data-testid="button-bored-return">Keep exploring <ChevronRight size={17} /></button>
        </div>
      </main>
      <EventDetailsDialog item={selectedItem} saved={selectedItem ? saved.includes(selectedItem.id) : false} onToggle={toggleSaved} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Discover} />
        <Route path="/bored" component={Bored} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
