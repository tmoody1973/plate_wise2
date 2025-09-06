/**
 * Enhanced Store Selection Card Component
 * Designed for accessibility - senior citizens and immigrants
 * Features large text, clear visuals, and multi-language support
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface StoreInfo {
  id: string;
  placeId: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  photo?: string;
  rating?: number;
  userRatingsTotal?: number;
  distance?: number;
  isOpen?: boolean;
  hours?: string[];
  types?: string[];
  priceLevel?: number;
  features?: {
    hasPharmacy?: boolean;
    hasAccessibility?: boolean;
    hasEthnicFoods?: boolean;
    hasBakery?: boolean;
    hasDeliCounter?: boolean;
    hasParkingLot?: boolean;
    hasOnlineOrdering?: boolean;
  };
  location?: {
    lat: number;
    lng: number;
  };
  selected?: boolean;
  category?: 'primary' | 'ethnic' | 'budget' | 'convenience';
}

interface StoreSelectionCardProps {
  store: StoreInfo;
  onSelect: (store: StoreInfo) => void;
  onToggleFavorite?: (storeId: string) => void;
  isFavorite?: boolean;
  showDistance?: boolean;
  largeText?: boolean; // For accessibility
  language?: 'en' | 'es' | 'zh' | 'vi' | 'so' | 'hmn'; // Common immigrant languages in MN
}

// Multi-language labels
const translations = {
  en: {
    openNow: 'Open Now',
    closed: 'Closed',
    miles: 'miles',
    selectStore: 'Select Store',
    selected: 'Selected',
    call: 'Call Store',
    directions: 'Get Directions',
    pharmacy: 'Pharmacy',
    accessible: 'Wheelchair Accessible',
    international: 'International Foods',
    bakery: 'Bakery',
    deli: 'Deli Counter',
    parking: 'Free Parking',
    onlineOrder: 'Online Ordering',
    rating: 'Rating',
    reviews: 'reviews',
    affordable: 'Budget Friendly',
    moderate: 'Moderate Prices',
    expensive: 'Premium Store'
  },
  es: {
    openNow: 'Abierto Ahora',
    closed: 'Cerrado',
    miles: 'millas',
    selectStore: 'Seleccionar Tienda',
    selected: 'Seleccionada',
    call: 'Llamar Tienda',
    directions: 'Obtener Direcciones',
    pharmacy: 'Farmacia',
    accessible: 'Accesible en Silla de Ruedas',
    international: 'Comida Internacional',
    bakery: 'Panadería',
    deli: 'Charcutería',
    parking: 'Estacionamiento Gratis',
    onlineOrder: 'Pedidos en Línea',
    rating: 'Calificación',
    reviews: 'reseñas',
    affordable: 'Económico',
    moderate: 'Precios Moderados',
    expensive: 'Tienda Premium'
  },
  zh: {
    openNow: '营业中',
    closed: '已关闭',
    miles: '英里',
    selectStore: '选择商店',
    selected: '已选择',
    call: '致电商店',
    directions: '获取路线',
    pharmacy: '药房',
    accessible: '无障碍通道',
    international: '国际食品',
    bakery: '烘焙',
    deli: '熟食柜台',
    parking: '免费停车',
    onlineOrder: '在线订购',
    rating: '评分',
    reviews: '条评论',
    affordable: '经济实惠',
    moderate: '价格适中',
    expensive: '高档商店'
  },
  vi: {
    openNow: 'Đang Mở',
    closed: 'Đã Đóng',
    miles: 'dặm',
    selectStore: 'Chọn Cửa Hàng',
    selected: 'Đã Chọn',
    call: 'Gọi Cửa Hàng',
    directions: 'Chỉ Đường',
    pharmacy: 'Nhà Thuốc',
    accessible: 'Xe Lăn Có Thể Vào',
    international: 'Thực Phẩm Quốc Tế',
    bakery: 'Tiệm Bánh',
    deli: 'Quầy Thịt Nguội',
    parking: 'Bãi Đậu Xe Miễn Phí',
    onlineOrder: 'Đặt Hàng Trực Tuyến',
    rating: 'Đánh Giá',
    reviews: 'nhận xét',
    affordable: 'Giá Rẻ',
    moderate: 'Giá Vừa Phải',
    expensive: 'Cửa Hàng Cao Cấp'
  },
  so: {
    openNow: 'Hadda Furan',
    closed: 'Xiran',
    miles: 'mayl',
    selectStore: 'Dooro Dukaan',
    selected: 'La Doortay',
    call: 'Wac Dukaanka',
    directions: 'Hel Jidka',
    pharmacy: 'Farmashi',
    accessible: 'Kursi Guurguura',
    international: 'Cunto Caalami',
    bakery: 'Rootiga',
    deli: 'Hilib Diyaar',
    parking: 'Baakiin Bilaash',
    onlineOrder: 'Dalbo Online',
    rating: 'Qiimeyn',
    reviews: 'faallooyin',
    affordable: 'Qiimo Jaban',
    moderate: 'Qiimo Dhexdhexaad',
    expensive: 'Dukaan Qaali'
  },
  hmn: {
    openNow: 'Qhib Tam Sim No',
    closed: 'Kaw Lawm',
    miles: 'mais',
    selectStore: 'Xaiv Khw',
    selected: 'Xaiv Lawm',
    call: 'Hu Khw',
    directions: 'Tau Kev Qhia',
    pharmacy: 'Tsev Muag Tshuaj',
    accessible: 'Lub Rooj Zaum Muaj Log',
    international: 'Zaub Mov Thoob Ntiaj Teb',
    bakery: 'Khob Noom',
    deli: 'Nqaij Npaj',
    parking: 'Chaw Nres Tsheb Dawb',
    onlineOrder: 'Xaj Online',
    rating: 'Ntsuas',
    reviews: 'kev tshuaj xyuas',
    affordable: 'Pheej Yig',
    moderate: 'Nqi Nruab Nrab',
    expensive: 'Khw Kim'
  }
};

export function StoreSelectionCard({ 
  store, 
  onSelect, 
  onToggleFavorite,
  isFavorite = false,
  showDistance = true,
  largeText = false,
  language = 'en'
}: StoreSelectionCardProps) {
  const [imageError, setImageError] = useState(false);
  const t = translations[language] || translations.en;
  
  // Determine text size based on accessibility needs
  const textSize = largeText ? 'text-lg' : 'text-base';
  const smallTextSize = largeText ? 'text-base' : 'text-sm';
  const titleSize = largeText ? 'text-2xl' : 'text-xl';
  
  // Get price level text
  const getPriceLevel = () => {
    if (!store.priceLevel) return null;
    if (store.priceLevel <= 1) return t.affordable;
    if (store.priceLevel === 2) return t.moderate;
    return t.expensive;
  };

  // Format phone number for display
  const formatPhone = (phone?: string) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className={`
      border-2 rounded-xl p-5 hover:shadow-xl transition-all duration-300
      ${store.selected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}
      ${largeText ? 'min-h-[450px]' : 'min-h-[400px]'}
    `}>
      {/* Store Image */}
      <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-gray-100">
        {store.photo && !imageError ? (
          <Image
            src={store.photo}
            alt={store.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        )}
        
        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(store.id)}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className={`w-6 h-6 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Store Name and Rating */}
      <div className="mb-3">
        <h3 className={`font-bold text-gray-900 mb-1 ${titleSize}`}>{store.name}</h3>
        {store.rating && (
          <div className={`flex items-center gap-2 ${smallTextSize}`}>
            <div className="flex items-center">
              <span className="text-yellow-500">{'★'.repeat(Math.round(store.rating))}</span>
              <span className="text-gray-300">{'★'.repeat(5 - Math.round(store.rating))}</span>
            </div>
            <span className="text-gray-600">
              {store.rating} ({store.userRatingsTotal || 0} {t.reviews})
            </span>
          </div>
        )}
      </div>

      {/* Address */}
      <p className={`text-gray-600 mb-3 ${smallTextSize}`}>{store.address}</p>

      {/* Distance and Status */}
      <div className="flex items-center gap-4 mb-4">
        {showDistance && store.distance !== undefined && (
          <span className={`font-semibold text-blue-600 ${textSize}`}>
            📍 {store.distance.toFixed(1)} {t.miles}
          </span>
        )}
        {store.isOpen !== undefined && (
          <span className={`font-semibold ${store.isOpen ? 'text-green-600' : 'text-red-600'} ${textSize}`}>
            {store.isOpen ? `✓ ${t.openNow}` : t.closed}
          </span>
        )}
        {getPriceLevel() && (
          <span className={`text-gray-600 ${smallTextSize}`}>
            {'$'.repeat(store.priceLevel || 1)} • {getPriceLevel()}
          </span>
        )}
      </div>

      {/* Store Features */}
      {store.features && (
        <div className="flex flex-wrap gap-2 mb-4">
          {store.features.hasPharmacy && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              💊 {t.pharmacy}
            </span>
          )}
          {store.features.hasAccessibility && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              ♿ {t.accessible}
            </span>
          )}
          {store.features.hasEthnicFoods && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
              🌍 {t.international}
            </span>
          )}
          {store.features.hasBakery && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              🥖 {t.bakery}
            </span>
          )}
          {store.features.hasDeliCounter && (
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              🥩 {t.deli}
            </span>
          )}
          {store.features.hasParkingLot && (
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
              🚗 {t.parking}
            </span>
          )}
          {store.features.hasOnlineOrdering && (
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
              🛒 {t.onlineOrder}
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onSelect(store)}
          className={`
            flex-1 py-3 px-4 rounded-lg font-semibold transition-colors
            ${store.selected 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
            ${largeText ? 'text-lg' : 'text-base'}
          `}
          aria-label={`Select ${store.name} as your store`}
        >
          {store.selected ? `✓ ${t.selected}` : t.selectStore}
        </button>
        
        {store.phone && (
          <button
            onClick={() => window.open(`tel:${store.phone}`, '_self')}
            className="p-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label={`Call ${store.name}`}
            title={t.call}
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        )}
        
        {store.location && (
          <button
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${store.location!.lat},${store.location!.lng}`;
              window.open(url, '_blank');
            }}
            className="p-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label={`Get directions to ${store.name}`}
            title={t.directions}
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        )}

        {store.website && (
          <button
            onClick={() => window.open(store.website, '_blank')}
            className="p-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label={`Visit ${store.name} website`}
            title="Visit Website"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}