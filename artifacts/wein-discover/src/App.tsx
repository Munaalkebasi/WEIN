import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
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
  UserRound,
  UsersRound,
  Utensils,
  Waves,
  X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

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
};

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
  },
];

const friends = [
  { initials: 'AR', name: 'Amara', title: 'Heritage Coffee Crawl', image: '/images/coffee.jpg' },
  { initials: 'JM', name: 'Jae + 2', title: 'Pixel Night at Glitch', image: '/images/arcade.jpg' },
  { initials: 'SK', name: 'Suki', title: 'River Sunset Walk', image: '/images/park.jpg' },
];

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
      onClick={() => onToggle(id)}
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

function FeatureCard({ saved, onToggle }: { saved: boolean; onToggle: (id: string) => void }) {
  const item = items[0];
  return (
    <article className="feature-card" data-testid="card-feature-night-market">
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
        <button type="button" className="feature-cta" onClick={() => document.getElementById('happening-tonight')?.scrollIntoView({ behavior: 'smooth' })} data-testid="button-see-whats-happening">
          See what&apos;s happening <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}

function EventCard({
  item,
  saved,
  onToggle,
  compact = false,
}: {
  item: DiscoverItem;
  saved: boolean;
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <article className={`event-card ${compact ? 'event-card-compact' : ''}`} data-testid={`card-event-${item.id}`}>
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
  return (
    <header className="discover-header">
      <div className="brand-row">
        <div className="wordmark" aria-label="WEIN, where to next?">
          <span className="wordmark-mark" aria-hidden="true">
            <MapPin size={27} />
            <span>W</span>
          </span>
          <span>WEIN</span>
          <span className="arabic-mark" lang="ar">وين</span>
        </div>
        <div className="location-lockup">
          <MapPin size={14} />
          <span>Surrey, BC</span>
        </div>
        <button type="button" className="icon-button notification-button" aria-label="Notifications" data-testid="button-notifications">
          <Bell size={19} />
          <span className="notification-dot" />
        </button>
      </div>
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

function TabPlaceholder({ tab, onBack }: { tab: Exclude<Tab, 'Discover'>; onBack: () => void }) {
  const copy: Record<Exclude<Tab, 'Discover'>, { title: string; body: string }> = {
    Live: { title: 'Live is warming up', body: 'A quick view of what is moving nearby is next.' },
    Create: { title: 'Make the plan', body: 'Soon you can drop an idea and invite your people.' },
    Plans: { title: 'Your plans, in one place', body: 'Saved nights and shared plans are coming next.' },
    You: { title: 'Your WEIN, your way', body: 'Your profile and saved places are on the way.' },
  };
  const selected = copy[tab];
  return (
    <main className="tab-placeholder page-enter" data-testid={`placeholder-${tab.toLowerCase()}`}>
      <div className="placeholder-mark"><Compass size={25} /></div>
      <p className="section-eyebrow">{tab} / COMING NEXT</p>
      <h1>{selected.title}</h1>
      <p>{selected.body}</p>
      <button type="button" className="outline-button" onClick={onBack} data-testid="button-back-to-discover">
        <ArrowLeft size={16} /> Back to Discover
      </button>
    </main>
  );
}

function Discover() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [saved, setSaved] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('Discover');
  const [saveMessage, setSaveMessage] = useState('');

  const toggleSaved = (id: string) => {
    const isSaved = saved.includes(id);
    setSaved((current) => isSaved ? current.filter((item) => item !== id) : [...current, id]);
    setSaveMessage(isSaved ? 'Removed from your plans' : 'Saved to your plans');
    window.setTimeout(() => setSaveMessage(''), 1800);
  };

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = (() => {
        switch (category) {
          case 'Trending':
            return item.status === 'TRENDING';
          case 'Tonight':
            return item.time !== '10:00 PM';
          case 'Music':
            return item.category === 'Music';
          case 'Food':
            return item.category === 'Food & Drink';
          case 'Sports':
            return item.title.toLowerCase().includes('volleyball');
          case 'Social':
            return item.title.toLowerCase().includes('meet people') || Boolean(item.social);
          case 'Free':
            return item.price === 'Free';
          case 'Learn':
            return item.category === 'Learn';
          default:
            return true;
        }
      })();
      const matchesQuery = !normalizedQuery || `${item.title} ${item.category} ${item.price}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const happening = filteredItems.filter((item) => item.id === 'heritage-coffee' || item.id === 'pixel-night');
  const forYou = filteredItems.filter((item) => item.id === 'river-sunset' || item.id === 'heritage-coffee');
  const openNow = filteredItems.filter((item) => item.status === 'OPEN NOW');
  const freeThisWeek = filteredItems.filter((item) => item.price === 'Free');

  return (
    <div className="wein-shell grain">
      <div className="app-content">
        <Header query={query} onQueryChange={setQuery} category={category} onCategoryChange={setCategory} />
        {activeTab === 'Discover' ? (
          <main className="discover-main page-enter">
            <FeatureCard saved={saved.includes('night-market')} onToggle={toggleSaved} />

            <section className="content-section" id="happening-tonight">
              <SectionHeading eyebrow="RIGHT NOW" title="Happening tonight" action="See all" onAction={() => { setQuery(''); setCategory('All'); }} />
              {happening.length > 0 ? (
                <div className="event-list">
                  {happening.map((item) => <EventCard key={item.id} item={item} saved={saved.includes(item.id)} onToggle={toggleSaved} />)}
                </div>
              ) : (
                <EmptyResults query={query} />
              )}
            </section>

            <section className="content-section friends-section">
              <SectionHeading eyebrow="YOUR PEOPLE" title="Friends are going" action="See all" onAction={() => document.querySelector('.friends-scroller')?.scrollTo({ left: 0, behavior: 'smooth' })} />
              <div className="friends-scroller hide-scrollbar">
                {friends.map((friend) => (
                  <article className="friend-card" key={friend.initials} data-testid={`card-friend-${friend.initials.toLowerCase()}`}>
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
              <SectionHeading eyebrow="PICKED FOR YOU" title="For you" action="Refresh" onAction={() => { setQuery(''); setCategory('All'); }} />
              {forYou.length > 0 ? (
                <div className="event-list">
                  {forYou.map((item) => <EventCard key={`for-${item.id}`} item={item} saved={saved.includes(item.id)} onToggle={toggleSaved} />)}
                </div>
              ) : <EmptyResults query={query} />}
            </section>

            <section className="content-section split-section">
              <div>
                <SectionHeading eyebrow="OPEN" title="Open right now" />
                {openNow.length > 0 ? openNow.map((item) => <EventCard key={`open-${item.id}`} item={item} compact saved={saved.includes(item.id)} onToggle={toggleSaved} />) : <p className="muted-note">Nothing open matches that filter.</p>}
              </div>
              <div>
                <SectionHeading eyebrow="NO TICKET NEEDED" title="Free this week" />
                {freeThisWeek.length > 0 ? freeThisWeek.map((item) => <EventCard key={`free-${item.id}`} item={item} compact saved={saved.includes(item.id)} onToggle={toggleSaved} />) : <p className="muted-note">Try All for more free finds.</p>}
              </div>
            </section>

            <p className="demo-note">Demo places for Surrey, BC · details are for exploring WEIN</p>
          </main>
        ) : (
          <TabPlaceholder tab={activeTab} onBack={() => setActiveTab('Discover')} />
        )}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        {saveMessage && <div className="save-toast" role="status" data-testid="status-save-feedback"><Check size={15} /> {saveMessage}</div>}
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
  return (
    <div className="wein-shell grain">
      <main className="bored-page page-enter" data-testid="page-bored">
        <button type="button" className="back-link" onClick={() => setLocation('/')} data-testid="button-bored-back">
          <ArrowLeft size={17} /> Discover
        </button>
        <div className="bored-page-mark"><Sparkles size={30} /></div>
        <p className="section-eyebrow">WEIN / NEXT UP</p>
        <h1>The good part is coming.</h1>
        <p className="bored-page-copy">We&apos;re building the little bit of magic that picks a place when you&apos;re out of ideas.</p>
        <div className="bored-preview">
          <div><span className="preview-line short" /><span className="preview-line" /><span className="preview-line tiny" /></div>
          <span className="preview-question">what are you feeling?</span>
        </div>
        <button type="button" className="primary-button" onClick={() => setLocation('/')} data-testid="button-bored-return">
          Keep exploring <ChevronRight size={17} />
        </button>
      </main>
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