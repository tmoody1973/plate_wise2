'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/toast';

export interface SavedStore {
  id: string;
  store_name: string;
  address: string;
  google_place_id: string;
  store_url?: string;
  phone?: string;
  rating?: number;
  is_favorite: boolean;
  notes?: string;
  store_type: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

interface SavedStoresSectionProps {
  onAddMoreStores: () => void;
  refreshTrigger?: number; // Used to trigger refresh after new stores are saved
  userLanguage?: 'en' | 'es' | 'zh' | 'vi' | 'so' | 'hmn';
  largeText?: boolean;
}

const translations = {
  en: {
    title: 'Your Saved Stores',
    noStores: 'No stores saved yet',
    addMore: '+ Add More Stores',
    favorite: 'Favorite',
    unfavorite: 'Remove from favorites',
    edit: 'Edit store',
    remove: 'Remove store',
    website: 'Visit website',
    call: 'Call store',
    directions: 'Get directions',
    confirmRemove: 'Remove this store from your list?',
    cancel: 'Cancel',
    confirm: 'Remove',
    notes: 'Notes',
    saveNotes: 'Save Notes',
    addNotes: 'Add notes...'
  },
  es: {
    title: 'Tus Tiendas Guardadas',
    noStores: 'No hay tiendas guardadas',
    addMore: '+ Agregar Más Tiendas',
    favorite: 'Favorito',
    unfavorite: 'Quitar de favoritos',
    edit: 'Editar tienda',
    remove: 'Eliminar tienda',
    website: 'Visitar sitio web',
    call: 'Llamar tienda',
    directions: 'Obtener direcciones',
    confirmRemove: '¿Eliminar esta tienda de tu lista?',
    cancel: 'Cancelar',
    confirm: 'Eliminar',
    notes: 'Notas',
    saveNotes: 'Guardar Notas',
    addNotes: 'Agregar notas...'
  },
  zh: {
    title: '您保存的商店',
    noStores: '尚未保存商店',
    addMore: '+ 添加更多商店',
    favorite: '收藏',
    unfavorite: '取消收藏',
    edit: '编辑商店',
    remove: '删除商店',
    website: '访问网站',
    call: '致电商店',
    directions: '获取路线',
    confirmRemove: '从列表中删除此商店？',
    cancel: '取消',
    confirm: '删除',
    notes: '备注',
    saveNotes: '保存备注',
    addNotes: '添加备注...'
  },
  vi: {
    title: 'Cửa Hàng Đã Lưu',
    noStores: 'Chưa lưu cửa hàng nào',
    addMore: '+ Thêm Cửa Hàng',
    favorite: 'Yêu thích',
    unfavorite: 'Bỏ yêu thích',
    edit: 'Sửa cửa hàng',
    remove: 'Xóa cửa hàng',
    website: 'Xem website',
    call: 'Gọi cửa hàng',
    directions: 'Chỉ đường',
    confirmRemove: 'Xóa cửa hàng này khỏi danh sách?',
    cancel: 'Hủy',
    confirm: 'Xóa',
    notes: 'Ghi chú',
    saveNotes: 'Lưu Ghi Chú',
    addNotes: 'Thêm ghi chú...'
  },
  so: {
    title: 'Dukaannadaada La Kaydiyay',
    noStores: 'Weli dukaan lama kaydin',
    addMore: '+ Ku Dar Dukaammo Badan',
    favorite: 'Jecel',
    unfavorite: 'Ka saar jecelka',
    edit: 'Wax ka beddel',
    remove: 'Masax',
    website: 'Booqo website',
    call: 'Wac dukaanka',
    directions: 'Hel waddooyinka',
    confirmRemove: 'Dukaankan ka saar liiska?',
    cancel: 'Jooji',
    confirm: 'Masax',
    notes: 'Qoraalka',
    saveNotes: 'Kaydi Qoraalka',
    addNotes: 'Ku dar qoraal...'
  },
  hmn: {
    title: 'Koj Cov Khw Muag Khoom Khaws Cia',
    noStores: 'Tseem tsis tau khaws khw muag khoom',
    addMore: '+ Ntxiv Ntau Khw',
    favorite: 'Nyiam',
    unfavorite: 'Tshem tawm ntawm cov nyiam',
    edit: 'Kho khw muag khoom',
    remove: 'Tshem tawm khw',
    website: 'Mus saib lub website',
    call: 'Hu rau khw',
    directions: 'Tau cov lus qhia',
    confirmRemove: 'Tshem lub khw no tawm ntawm koj daim ntawv?',
    cancel: 'Tsis ua',
    confirm: 'Tshem tawm',
    notes: 'Cov ntawv sau',
    saveNotes: 'Txuag Cov Ntawv Sau',
    addNotes: 'Ntxiv cov ntawv sau...'
  }
};

export function SavedStoresSection({ 
  onAddMoreStores, 
  refreshTrigger = 0,
  userLanguage = 'en',
  largeText = false 
}: SavedStoresSectionProps) {
  const [savedStores, setSavedStores] = useState<SavedStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [showConfirmRemove, setShowConfirmRemove] = useState<string | null>(null);
  const { addToast } = useToast();
  const t = translations[userLanguage];

  // Fetch saved stores
  useEffect(() => {
    fetchSavedStores();
  }, [refreshTrigger]);

  const fetchSavedStores = async () => {
    try {
      const response = await fetch('/api/stores/saved');
      if (response.ok) {
        const data = await response.json();
        setSavedStores(data.stores || []);
      }
    } catch (error) {
      console.error('Failed to fetch saved stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (storeId: string) => {
    const store = savedStores.find(s => s.id === storeId);
    if (!store) return;

    try {
      const response = await fetch('/api/stores/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          storeId, 
          isFavorite: !store.is_favorite 
        })
      });

      if (response.ok) {
        setSavedStores(prev => prev.map(s => 
          s.id === storeId ? { ...s, is_favorite: !s.is_favorite } : s
        ));
        addToast({
          type: 'success',
          title: store.is_favorite ? t.unfavorite : t.favorite,
          message: `${store.store_name} ${store.is_favorite ? 'removed from' : 'added to'} favorites`
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Update failed',
        message: 'Could not update favorite status'
      });
    }
  };

  const handleEditNotes = (storeId: string, currentNotes: string = '') => {
    setEditingStore(storeId);
    setEditNotes(currentNotes || '');
  };

  const handleSaveNotes = async () => {
    if (!editingStore) return;

    try {
      const response = await fetch('/api/stores/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          storeId: editingStore, 
          notes: editNotes 
        })
      });

      if (response.ok) {
        setSavedStores(prev => prev.map(s => 
          s.id === editingStore ? { ...s, notes: editNotes } : s
        ));
        setEditingStore(null);
        addToast({
          type: 'success',
          title: t.saveNotes,
          message: 'Notes saved successfully'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save failed',
        message: 'Could not save notes'
      });
    }
  };

  const handleRemoveStore = async (storeId: string) => {
    try {
      const response = await fetch(`/api/stores/remove/${storeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSavedStores(prev => prev.filter(s => s.id !== storeId));
        const store = savedStores.find(s => s.id === storeId);
        addToast({
          type: 'success',
          title: 'Store removed',
          message: `${store?.store_name} has been removed from your list`
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Remove failed',
        message: 'Could not remove store'
      });
    } finally {
      setShowConfirmRemove(null);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold text-gray-800 ${largeText ? 'text-xl' : 'text-lg'}`}>
          📍 {t.title} ({savedStores.length})
        </h3>
      </div>

      {/* Saved Stores List */}
      {savedStores.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-400 text-4xl mb-3">🛒</div>
          <p className={`text-gray-600 mb-4 ${largeText ? 'text-lg' : ''}`}>
            {t.noStores}
          </p>
          <button
            onClick={onAddMoreStores}
            className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium ${largeText ? 'text-lg' : ''}`}
          >
            {t.addMore}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {savedStores.map((store) => (
            <div
              key={store.id}
              className="bg-white border-2 border-green-200 rounded-lg p-4 hover:border-green-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-semibold text-gray-800 ${largeText ? 'text-lg' : ''}`}>
                      {store.store_name}
                    </h4>
                    {store.is_favorite && (
                      <span className="text-yellow-500 text-lg">⭐</span>
                    )}
                  </div>
                  <p className={`text-gray-600 ${largeText ? 'text-base' : 'text-sm'}`}>
                    {store.address}
                  </p>
                  {store.notes && (
                    <p className={`text-gray-700 mt-1 italic ${largeText ? 'text-base' : 'text-sm'}`}>
                      "{store.notes}"
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 ml-4">
                  {/* Favorite Button */}
                  <button
                    onClick={() => handleToggleFavorite(store.id)}
                    className={`p-2 rounded-full transition-colors ${
                      store.is_favorite 
                        ? 'text-yellow-500 hover:text-yellow-600' 
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    title={store.is_favorite ? t.unfavorite : t.favorite}
                  >
                    {store.is_favorite ? '❤️' : '🤍'}
                  </button>

                  {/* Website Button */}
                  {store.store_url && (
                    <a
                      href={store.store_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-500 hover:text-blue-600 rounded-full transition-colors"
                      title={t.website}
                    >
                      🌐
                    </a>
                  )}

                  {/* Phone Button */}
                  {store.phone && (
                    <a
                      href={`tel:${store.phone}`}
                      className="p-2 text-green-500 hover:text-green-600 rounded-full transition-colors"
                      title={t.call}
                    >
                      📞
                    </a>
                  )}

                  {/* Edit Button */}
                  <button
                    onClick={() => handleEditNotes(store.id, store.notes)}
                    className="p-2 text-gray-500 hover:text-gray-600 rounded-full transition-colors"
                    title={t.edit}
                  >
                    ✏️
                  </button>

                  {/* Remove Button */}
                  <button
                    onClick={() => setShowConfirmRemove(store.id)}
                    className="p-2 text-red-500 hover:text-red-600 rounded-full transition-colors"
                    title={t.remove}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Edit Notes Form */}
              {editingStore === store.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <textarea
                    value={editNotes || ''}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={t.addNotes}
                    className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${largeText ? 'text-base' : 'text-sm'}`}
                    rows={3}
                  />
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={handleSaveNotes}
                      className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${largeText ? 'text-base' : 'text-sm'}`}
                    >
                      {t.saveNotes}
                    </button>
                    <button
                      onClick={() => setEditingStore(null)}
                      className={`px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ${largeText ? 'text-base' : 'text-sm'}`}
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add More Stores Button */}
          <button
            onClick={onAddMoreStores}
            className={`w-full py-4 border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-colors font-medium ${largeText ? 'text-lg' : ''}`}
          >
            {t.addMore}
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-mx-4">
            <h3 className={`font-semibold text-gray-800 mb-4 ${largeText ? 'text-lg' : ''}`}>
              {t.confirmRemove}
            </h3>
            <div className="flex space-x-4">
              <button
                onClick={() => handleRemoveStore(showConfirmRemove)}
                className={`flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ${largeText ? 'text-base' : 'text-sm'}`}
              >
                {t.confirm}
              </button>
              <button
                onClick={() => setShowConfirmRemove(null)}
                className={`flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ${largeText ? 'text-base' : 'text-sm'}`}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}