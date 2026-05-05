import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, X, ChevronRight, Star, MapPin, Phone, Clock, Instagram, Facebook,
  UtensilsCrossed, Quote, LogIn, LogOut, Calendar, Users, Mail, User
} from 'lucide-react';
import { 
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, type User as FirebaseUser 
} from 'firebase/auth';
import { db, auth } from './lib/firebase';

const TABLES = [
  { id: 'T2A', cap: 2 }, { id: 'T2B', cap: 2 }, { id: 'T2C', cap: 2 },
  { id: 'T4A', cap: 4 }, { id: 'T4B', cap: 4 }, { id: 'T4C', cap: 4 }, { id: 'T4D', cap: 4 },
  { id: 'T5A', cap: 5 }, { id: 'T5B', cap: 5 },
];

const RESERVATION_DURATION_HOURS = 2;

const isRestaurantOpen = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  
  // 11:00 is 660 mins
  // 01:30 (next day) is 90 mins or 1530 mins in day relative
  const openTime = 11 * 60;
  const closeTime = 1 * 60 + 30; // 01:30 next day
  
  if (hours >= 11) {
    return totalMinutes >= openTime && totalMinutes < 24 * 60;
  } else {
    return totalMinutes < closeTime;
  }
};

const getAvailableTable = (peopleCount: number, date: string, time: string, existingReservations: any[]) => {
  const [h1, m1] = time.split(':').map(Number);
  const startMins = h1 * 60 + m1;
  const endMins = startMins + RESERVATION_DURATION_HOURS * 60;

  // Filter tables that can accommodate the group
  const potentialTables = TABLES.filter(t => t.cap >= peopleCount).sort((a, b) => a.cap - b.cap);

  for (const table of potentialTables) {
    const isOccupied = existingReservations.some(res => {
      if (res.date !== date || res.tableId !== table.id) return false;
      const [h2, m2] = res.time.split(':').map(Number);
      const resStart = h2 * 60 + m2;
      const resEnd = resStart + RESERVATION_DURATION_HOURS * 60;
      
      // Check overlap
      return (startMins < resEnd && endMins > resStart);
    });

    if (!isOccupied) return table.id;
  }
  return null;
};

enum OperationType { CREATE = 'create', UPDATE = 'update', DELETE = 'delete', LIST = 'list', GET = 'get', WRITE = 'write' }
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = { error: error instanceof Error ? error.message : String(error), authInfo: { userId: auth.currentUser?.uid, email: auth.currentUser?.email, emailVerified: auth.currentUser?.emailVerified }, operationType, path };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const navLinks = [
    { name: 'Home', href: '#home' }, { name: 'Menu', href: '#menu' },
    { name: 'Reviews', href: '#reviews' }, { name: 'Over Ons', href: '#over-ons' }, { name: 'Contact', href: '#contact' }
  ];
  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-beige-soft/95 backdrop-blur-md py-4 border-b border-espresso/10' : 'bg-transparent py-8'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-espresso">
        <a href="#home" className="text-2xl font-bold tracking-tight uppercase">Cantine Roland</a>
        <div className="hidden md:flex space-x-10 items-center">
          {navLinks.map((link) => <a key={link.name} href={link.href} className="text-xs uppercase tracking-widest font-semibold hover:text-terracotta transition-colors">{link.name}</a>)}
          <a href="#contact" className="bg-terracotta text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-espresso transition-all duration-300 rounded-sm">Reservaties</a>
        </div>
        <button className="md:hidden p-2 text-espresso hover:text-terracotta transition-colors" onClick={() => setIsOpen(!isOpen)}><Menu size={28} /></button>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute top-full left-0 w-full bg-beige-soft border-t border-espresso/10 md:hidden flex flex-col items-center py-12 space-y-8 shadow-2xl">
            {navLinks.map((link) => <a key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="text-lg uppercase tracking-widest font-semibold hover:text-terracotta transition-colors">{link.name}</a>)}
            <a href="#contact" onClick={() => setIsOpen(false)} className="bg-terracotta text-white px-10 py-4 text-sm uppercase tracking-widest font-bold rounded-sm shadow-lg">Reservaties</a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => (
  <section id="home" className="relative h-screen flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?q=80&w=2574&auto=format&fit=crop")' }}>
      <div className="absolute inset-0 bg-espresso/45 backdrop-blur-[1px]" />
    </div>
    <div className="relative z-10 text-center text-beige-soft px-6 max-w-4xl mx-auto">
      <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="text-sm uppercase tracking-[0.5em] font-medium mb-6">Welkom bij de huiskamer van Lokeren</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} className="text-7xl md:text-[9rem] lg:text-[11rem] font-sans font-medium tracking-tighter leading-[0.8] mb-12">Eerlijke Keuken.<br/>Puur Genot.</motion.h1>
      <div className="flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-12">
        <span className="text-xl md:text-2xl italic font-serif opacity-90">Brasserie & Genieten in Lokeren</span>
        <a href="#menu" className="bg-terracotta hover:bg-white hover:text-espresso text-white px-8 py-4 text-sm uppercase tracking-[0.2em] font-bold transition-all duration-300 rounded-sm shadow-2xl flex items-center space-x-3"><span>Bekijk onze kaart</span><ChevronRight size={18} /></a>
      </div>
    </div>
  </section>
);

const MenuSection = () => {
  const categories = [
    { title: "De Klassiekers", items: [{ name: "Steak met Pepersaus", description: "Mals geserveerd met verse frietjes", price: "€28,50" }, { name: "Garnaalkroketten", description: "Huisgemaakt (2 of 3 stuks)", price: "€18,00" }, { name: "Vol-au-vent", description: "Met hoevekip en gehaktballetjes", price: "€22,00" }] },
    { title: "Onze Unieke Croques", items: [{ name: "Croque Roland", description: "Met ambachtelijk brood", price: "€14,50" }, { name: "Croque Madame", description: "Met een perfect spiegelei", price: "€15,50" }, { name: "Croque Boem-Boem", description: "Met huisgemaakte spaghettisaus", price: "€16,50" }] },
    { title: "Zoete Verwennerij", items: [{ name: "Coupe Aardbei", description: "Met huisgedraaid vanille-ijs", price: "€9,50" }, { name: "Moelleux au Chocolat", description: "Lopend hart van pure chocolade", price: "€10,50" }, { name: "Dame Blanche", description: "Met warme chocoladesaus", price: "€8,50" }] }
  ];
  return (
    <section id="menu" className="section-padding bg-beige-soft">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <span className="text-xs uppercase tracking-[0.3em] font-bold text-terracotta mb-4 block">Smaakvol & Ambachtelijk</span>
          <h2 className="text-4xl md:text-6xl font-serif">Op Onze Kaart</h2>
        </div>
        <div className="grid lg:grid-cols-3 gap-px bg-espresso/10 border border-espresso/10">
          {categories.map((cat, idx) => (
            <motion.div key={cat.title} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: idx * 0.1 }} className="bg-beige-soft p-10 space-y-10">
              <h3 className="text-xs font-bold tracking-widest uppercase text-terracotta">{cat.title}</h3>
              <div className="space-y-8">
                {cat.items.map((item) => (
                  <div key={item.name} className="group">
                    <div className="flex justify-between items-baseline mb-2"><h4 className="text-lg font-medium group-hover:text-terracotta transition-colors">{item.name}</h4><span className="text-sm font-semibold">{item.price}</span></div>
                    <p className="text-sm text-espresso/60 italic">{item.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Reviews = () => (
  <section id="reviews" className="section-padding bg-beige-warm relative overflow-hidden">
    <div className="max-w-7xl mx-auto relative z-10">
      <div className="flex flex-col md:flex-row items-center justify-between mb-16">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif mb-4">Gasten Aan het Woord</h2>
          <div className="flex items-center space-x-4"><span className="text-3xl font-bold text-terracotta">4,3/5</span><div className="flex text-terracotta">{[...Array(5)].map((_, i) => <Star key={i} size={18} fill={i < 4 ? "currentColor" : "none"} />)}</div></div>
        </div>
        <div className="bg-espresso text-beige-soft p-10 rounded-2xl max-w-sm rotate-2 shadow-xl"><Quote className="text-terracotta mb-4" size={40} /><p className="text-lg italic font-serif leading-relaxed text-beige-soft">\"Authentieke smaken en een warme ontvangst staan hier centraal.\"</p></div>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {[{ name: "Sophie D.", text: "De beste croques van Lokeren!" }, { name: "Marc V.", text: "Gezellig terras en een heerlijke steak." }, { name: "Elena K.", text: "Prachtige inrichting en een top score verdiend." }].map((rev, idx) => (
          <motion.div key={rev.name} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} className="bg-beige-soft p-10 rounded-[2.5rem] shadow-sm border border-espresso/5 flex flex-col justify-between">
            <p className="text-espresso/70 mb-8 italic">\"{rev.text}\"</p>
            <div className="flex items-center justify-between border-t border-espresso/10 pt-6"><span className="font-bold tracking-widest uppercase text-xs text-espresso">{rev.name}</span><div className="flex text-terracotta/40 scale-75">{[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}</div></div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const About = () => (
  <section id="over-ons" className="section-padding bg-beige-soft">
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-20 items-center">
      <div className="w-full lg:w-1/2 relative">
        <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl">
          <img src="https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2574&auto=format&fit=crop" alt="Interior" className="w-full h-full object-cover" />
        </motion.div>
        <div className="absolute -bottom-10 -right-10 bg-terracotta p-12 rounded-[2rem] hidden md:block text-beige-soft"><UtensilsCrossed size={48} /><h4 className="mt-4 font-serif text-2xl">Sinds 1984</h4></div>
      </div>
      <div className="w-full lg:w-1/2 space-y-10">
        <span className="text-xs uppercase tracking-[0.4em] font-bold text-terracotta">Onze Passie</span>
        <h2 className="text-4xl md:text-6xl font-serif text-espresso leading-tight">Een Warm Hart in Lokeren</h2>
        <div className="space-y-6 text-espresso/70 text-lg leading-relaxed">
          <p>Cantine Roland is meer dan een brasserie; het is een plek waar tijd vertraagt.</p>
          <p className="italic font-serif py-4 border-l-2 border-terracotta pl-6 text-espresso">\"Wij ontvangen u zoals wij onze eigen vrienden thuis zouden ontvangen.\"</p>
        </div>
      </div>
    </div>
  </section>
);

const ReservationList = ({ user }: { user: FirebaseUser }) => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRes, setSelectedRes] = useState<any | null>(null);

  useEffect(() => {
    const path = 'reservations';
    const q = query(collection(db, path), orderBy('date', 'desc'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReservations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (user.email !== 'bramvanherreweghe117@gmail.com') return <div className="text-center py-40 font-serif text-espresso">Toegang voorbehouden aan beheerder.</div>;

  const groupedReservations = reservations.reduce((acc: any, res) => {
    if (!acc[res.date]) acc[res.date] = [];
    acc[res.date].push(res);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto my-10 font-sans">
      <div className="flex justify-between items-center mb-12 bg-white p-8 rounded-3xl shadow-sm border border-espresso/5">
        <div className="flex items-center space-x-4">
          <div className="bg-terracotta/10 p-3 rounded-2xl text-terracotta">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-serif text-espresso">Reservatiebeheer</h2>
            <p className="text-xs uppercase tracking-widest text-espresso/40 font-bold">Overzicht per dag</p>
          </div>
        </div>
        <button onClick={() => signOut(auth)} className="flex items-center space-x-2 text-xs uppercase tracking-widest font-bold opacity-60 hover:opacity-100 transition-opacity"><LogOut size={14} /><span>Afmelden</span></button>
      </div>

      {loading ? (
        <div className="text-center py-20 font-serif italic opacity-40">Gegevens laden...</div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-espresso/10">
          <p className="text-espresso/40 italic">Geen reservaties gevonden.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedReservations).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayReservations]: [string, any]) => (
            <div key={date} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-espresso/5">
              <div className="bg-espresso/5 px-8 py-4 border-b border-espresso/5 flex justify-between items-center">
                <span className="font-serif text-lg text-espresso">{date}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-espresso/40">{dayReservations.length} reservaties</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest font-bold text-espresso/40">
                      <th className="px-8 py-4">Tijd</th>
                      <th className="px-8 py-4">Tafel</th>
                      <th className="px-8 py-4">Gasten</th>
                      <th className="px-8 py-4 text-right">Actie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-espresso/5">
                    {dayReservations.map((res: any) => (
                      <tr key={res.id} className="hover:bg-beige-warm/20 transition-colors group">
                        <td className="px-8 py-5 font-medium">{res.time} — {
                          (() => {
                            const [h, m] = res.time.split(':').map(Number);
                            const total = h * 60 + m + RESERVATION_DURATION_HOURS * 60;
                            const hOut = Math.floor(total / 60) % 24;
                            const mOut = total % 60;
                            return `${String(hOut).padStart(2, '0')}:${String(mOut).padStart(2, '0')}`;
                          })()
                        }</td>
                        <td className="px-8 py-5">
                          <span className="bg-terracotta/5 text-terracotta px-3 py-1 rounded-full text-xs font-bold">{res.tableId}</span>
                        </td>
                        <td className="px-8 py-5">{res.peopleCount} pers.</td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => setSelectedRes(res)}
                            className="text-xs uppercase tracking-widest font-bold text-terracotta opacity-60 group-hover:opacity-100 transition-all hover:underline"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedRes && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-espresso/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-beige-soft p-10 rounded-[3rem] max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedRes(null)}
                className="absolute top-8 right-8 text-espresso/40 hover:text-espresso"
              >
                <X size={24} />
              </button>
              <h3 className="text-3xl font-serif mb-8 pr-12">Reservatie Details</h3>
              
              <div className="space-y-6 text-espresso">
                <div className="flex items-center space-x-4 border-b border-espresso/10 pb-4">
                  <div className="bg-espresso/5 p-3 rounded-full"><User size={20} className="text-terracotta" /></div>
                  <div><p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Naam</p><p className="font-medium text-lg">{selectedRes.name}</p></div>
                </div>
                <div className="flex items-center space-x-4 border-b border-espresso/10 pb-4">
                  <div className="bg-espresso/5 p-3 rounded-full"><Mail size={20} className="text-terracotta" /></div>
                  <div><p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">E-mail</p><p className="font-medium text-lg">{selectedRes.email}</p></div>
                </div>
                <div className="flex items-center space-x-4 border-b border-espresso/10 pb-4">
                  <div className="bg-espresso/5 p-3 rounded-full"><Users size={20} className="text-terracotta" /></div>
                  <div><p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Gezelschap</p><p className="font-medium text-lg">{selectedRes.peopleCount} personen</p></div>
                </div>
                {selectedRes.message && (
                  <div className="bg-espresso/5 p-6 rounded-2xl">
                    <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold mb-2">Bericht</p>
                    <p className="italic text-sm opacity-80 leading-relaxed">"{selectedRes.message}"</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', peopleCount: '2', message: '', date: '', time: '18:00' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error' | 'full' | 'closed' | 'past'>('idle');
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'reservations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReservations(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    // Basic Validation
    const now = new Date();
    const resDate = new Date(`${formData.date}T${formData.time}`);
    
    if (resDate < now) {
      setStatus('past');
      return;
    }

    if (!isRestaurantOpen(formData.time)) {
      setStatus('closed');
      return;
    }

    const assignedTableId = getAvailableTable(parseInt(formData.peopleCount), formData.date, formData.time, reservations);

    if (!assignedTableId) {
      setStatus('full');
      return;
    }

    try {
      await addDoc(collection(db, 'reservations'), { 
        ...formData, 
        peopleCount: parseInt(formData.peopleCount), 
        tableId: assignedTableId,
        createdAt: serverTimestamp() 
      });
      setStatus('success');
      setFormData({ name: '', email: '', peopleCount: '2', message: '', date: '', time: '18:00' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reservations');
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="section-padding bg-espresso text-beige-soft">
      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:gap-20">
        <div className="space-y-16">
          <h2 className="text-5xl font-serif mb-12">Contact & Reservaties</h2>
          <div className="space-y-8">
            <div className="flex items-start space-x-6">
              <div className="bg-terracotta p-4 rounded-xl"><MapPin /></div>
              <div><h4 className="text-xs uppercase tracking-widest font-bold opacity-50 mb-2">Adres</h4><p className="text-xl">Stationsstraat 45, 9160 Lokeren</p></div>
            </div>
            <div className="flex items-start space-x-6">
              <div className="bg-terracotta p-4 rounded-xl"><Phone /></div>
              <div><h4 className="text-xs uppercase tracking-widest font-bold opacity-50 mb-2">Telefoon</h4><p className="text-xl">09 247 02 78</p></div>
            </div>
            <div className="flex items-start space-x-6">
              <div className="bg-terracotta p-4 rounded-xl"><Clock /></div>
              <div><h4 className="text-xs uppercase tracking-widest font-bold opacity-50 mb-2">Openingsuren</h4><p className="text-xl">11:00 — 01:30</p></div>
            </div>
          </div>
        </div>
        <div className="bg-beige-soft/5 p-12 rounded-[3.5rem] border border-beige-soft/10 text-beige-soft mt-10 lg:mt-0 relative overflow-hidden backdrop-blur-sm">
          <h3 className="text-3xl font-serif mb-10 text-center">Plan uw bezoek</h3>
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
                <div className="bg-terracotta/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-terracotta"><Star size={40} fill="currentColor" /></div>
                <h4 className="text-2xl font-serif mb-4">Bedankt voor uw aanvraag!</h4>
                <p className="opacity-60 text-sm">U ontvangt spoedig een bevestiging.</p>
              </motion.div>
            ) : (
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest opacity-60">Naam</label>
                    <input required className="w-full bg-transparent border-b border-white/20 py-3 focus:border-terracotta outline-none transition-colors" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest opacity-60">E-mail</label>
                    <input required type="email" className="w-full bg-transparent border-b border-white/20 py-3 focus:border-terracotta outline-none transition-colors" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest opacity-60">Datum</label>
                    <input required type="date" className="w-full bg-transparent border-b border-white/20 py-3 focus:border-terracotta outline-none transition-colors [color-scheme:dark]" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest opacity-60">Tijdstip</label>
                    <input required type="time" step="1800" className="w-full bg-transparent border-b border-white/20 py-3 focus:border-terracotta outline-none transition-colors [color-scheme:dark]" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-widest opacity-60">Gasten</label>
                    <select className="w-full bg-transparent border-b border-white/20 py-3 focus:border-terracotta outline-none transition-colors" value={formData.peopleCount} onChange={e => setFormData({...formData, peopleCount: e.target.value})}>
                      <option className="bg-espresso" value="2">2 personen</option>
                      <option className="bg-espresso" value="4">4 personen</option>
                      <option className="bg-espresso" value="5">5 personen</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest opacity-60">Speciale wensen</label>
                  <textarea rows={2} className="w-full bg-transparent border-b border-white/20 py-3 focus:border-terracotta outline-none transition-colors resize-none" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                </div>
                <div className="space-y-4">
                  <button className="w-full bg-beige-soft text-espresso py-6 rounded-sm uppercase tracking-widest font-bold hover:bg-terracotta hover:text-white transition-all shadow-2xl disabled:opacity-50" disabled={status === 'submitting'}>
                    {status === 'submitting' ? 'Verwerken...' : 'Reserveren'}
                  </button>
                  {status === 'full' && <p className="text-red-400 text-xs text-center">Helaas, geen tafels meer beschikbaar voor dit tijdstip.</p>}
                  {status === 'closed' && <p className="text-red-400 text-xs text-center">We zijn op dit tijdstip helaas gesloten.</p>}
                  {status === 'past' && <p className="text-red-400 text-xs text-center">U kunt niet reserveren in het verleden.</p>}
                  {status === 'error' && <p className="text-red-400 text-xs text-center">Er ging iets mis. Probeer het later opnieuw.</p>}
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
      if (u?.email === 'bramvanherreweghe117@gmail.com') {
        setShowAdmin(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try { 
      const res = await signInWithPopup(auth, new GoogleAuthProvider()); 
      if (res.user.email === 'bramvanherreweghe117@gmail.com') {
        setShowAdmin(true); 
      }
    } catch (e) { 
      console.error(e); 
    }
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-beige-soft font-serif italic text-espresso/40">Systeem laden...</div>;

  return (
    <div className="bg-beige-soft selection:bg-terracotta selection:text-beige-soft font-sans">
      <Navbar />
      <main>
        {showAdmin && user?.email === 'bramvanherreweghe117@gmail.com' ? (
          <div className="pt-32 pb-20 px-6 min-h-screen text-espresso">
            <ReservationList user={user} />
            <div className="text-center mt-10">
              <button 
                onClick={() => setShowAdmin(false)} 
                className="text-xs uppercase tracking-widest font-bold text-terracotta hover:underline border border-terracotta/20 px-6 py-3 rounded-full transition-all"
              >
                Terug naar website
              </button>
            </div>
          </div>
        ) : (
          <>
            <Hero />
            <MenuSection />
            <Reviews />
            <About />
            <Contact />
          </>
        )}
      </main>
      <footer className="bg-espresso text-beige-soft font-sans border-t border-white/10">
        <div className="grid md:grid-cols-3 gap-px bg-white/10">
          <div className="bg-espresso p-10"><span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Locatie</span><p className="text-lg">Stationsstraat 45, Lokeren</p></div>
          <div className="bg-espresso p-10"><span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Contact</span><p className="text-lg">09 247 02 78</p></div>
          <div className="bg-espresso p-10"><span className="text-[10px] font-bold uppercase tracking-widest text-white/40 block mb-2">Open</span><p className="text-lg">Dagelijks tot 01:30</p></div>
        </div>
        <div className="py-12 px-10 flex flex-col md:flex-row justify-between items-center opacity-40 text-[10px] uppercase tracking-widest font-bold">
          <div><span className="text-lg">Cantine Roland</span><p>© {new Date().getFullYear()}</p></div>
          <div className="flex items-center space-x-6 mt-6 md:mt-0">
            <button 
              onClick={() => user ? setShowAdmin(!showAdmin) : handleLogin()} 
              className="flex items-center space-x-2 text-terracotta border border-terracotta/30 px-3 py-1 rounded hover:bg-terracotta hover:text-white transition-colors"
            >
              <LogIn size={10} />
              <span>{user?.email === 'bramvanherreweghe117@gmail.com' ? 'Dashboard' : 'Owner Access'}</span>
            </button>
            {user && (
              <button onClick={() => signOut(auth)} className="opacity-60 hover:opacity-100 transition-opacity">Uitloggen</button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
