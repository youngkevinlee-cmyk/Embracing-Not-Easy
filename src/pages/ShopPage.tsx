import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useCart } from '../lib/CartContext';
import { useAuth } from '../lib/AuthContext';
import { ShoppingBag, Star, ArrowRight, X, Package, CreditCard, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EditableText from '../components/EditableText';

export default function ShopPage() {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { items, addToCart, removeFromCart, total, clearCart } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    const path = 'products';
    const unsub = onSnapshot(collection(db, path), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return unsub;
  }, []);

  const categories = ['All', 'Digital', 'Physical'];

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.type.toLowerCase() === activeCategory.toLowerCase());

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      if (user && profile) {
        // Collect cart item IDs
        const purchasedIds = items.map(item => item.id);
        const existingPurchases = profile.purchasedItems || [];
        const updatedPurchases = Array.from(new Set([...existingPurchases, ...purchasedIds]));
        
        // Update user document
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { purchasedItems: updatedPurchases });

        // Submit order document to /orders securely
        const orderId = `order_${Date.now()}`;
        const orderRef = doc(db, 'orders', orderId);
        await setDoc(orderRef, {
          userId: user.uid,
          items: items.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
          total: total,
          createdAt: new Date().toISOString()
        });
      }
      
      setIsCheckingOut(false);
      clearCart();
      setIsCartOpen(false);
      alert('Order placed successfully! Your digital products are unlocked and immediately accessible inside your My Profile tab.');
    } catch (err: any) {
      console.error('Checkout error:', err);
      setIsCheckingOut(false);
      alert('Checkout encountered an error: ' + err.message);
    }
  };

  return (
    <div className="py-8 space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <EditableText 
            id="shop-title" 
            defaultValue="Holistic Shop" 
            className="text-4xl font-serif font-bold text-stone-900 block" 
            tag="h1" 
          />
          <EditableText 
            id="shop-subtitle" 
            defaultValue="Tools for your journey, from physical tokens to digital downloads." 
            className="text-stone-500 mt-2 block" 
            tag="p" 
            multiline={true}
          />
        </div>
        
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative bg-stone-900 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-stone-800 transition-all"
        >
          <ShoppingBag className="w-5 h-5" />
          Cart ({items.length})
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-stone-900 text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-stone-50">
              {items.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          )}
        </button>
      </header>

      {/* Categories */}
      <div className="flex gap-4 border-b border-stone-100">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`pb-4 px-2 text-sm font-bold tracking-widest uppercase transition-all relative ${
              activeCategory === cat ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {cat}
            {activeCategory === cat && (
              <motion.div layoutId="activeCat" className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-900" />
            )}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredProducts.map((product) => (
          <motion.div 
            layout
            key={product.id}
            className="group bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-500"
          >
            <div className="aspect-square relative overflow-hidden bg-stone-50">
              <img 
                src={product.images?.[0] || 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=600'} 
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-4 left-4">
                {product.type === 'digital' ? (
                  <span className="bg-stone-900/10 backdrop-blur-md text-stone-900 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Download className="w-3 h-3" /> Digital
                  </span>
                ) : (
                  <span className="bg-amber-500/10 backdrop-blur-md text-amber-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Package className="w-3 h-3" /> Physical
                  </span>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                 <h3 className="font-bold text-stone-900 group-hover:text-stone-700 transition-colors">{product.name}</h3>
                 <span className="font-serif font-bold text-stone-900">${product.price}</span>
              </div>
              <p className="text-stone-500 text-xs line-clamp-2 leading-relaxed">
                {product.description}
              </p>
              <button 
                onClick={() => addToCart(product)}
                className="w-full py-3 bg-stone-50 text-stone-900 rounded-xl text-sm font-bold hover:bg-stone-900 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                Add to Cart <Plus className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <header className="p-8 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-2xl font-serif font-bold">Your Cart</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-stone-50 rounded-full">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {items.length === 0 ? (
                  <div className="text-center py-24 space-y-4">
                    <ShoppingBag className="w-16 h-16 mx-auto text-stone-100" />
                    <p className="text-stone-400">Your cart is feeling a bit empty.</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="text-stone-900 font-bold underline"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <img src={item.image} className="w-20 h-20 rounded-2xl object-cover" />
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between font-bold">
                          <span>{item.name}</span>
                          <span>${item.price * item.quantity}</span>
                        </div>
                        <p className="text-xs text-stone-400 uppercase tracking-widest">{item.type} • Qty: {item.quantity}</p>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 text-xs font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <footer className="p-8 bg-stone-50 space-y-6">
                  <div className="flex justify-between items-center text-xl font-serif font-bold">
                    <span>Total</span>
                    <span>${total}</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full py-5 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-stone-900/10 disabled:opacity-50"
                  >
                    {isCheckingOut ? (
                      'Processing...'
                    ) : (
                      <>Checkout Now <ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-2 text-stone-400 text-[10px] font-bold uppercase tracking-widest">
                    <CreditCard className="w-4 h-4" /> Secure Payment Processing
                  </div>
                </footer>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Plus(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
