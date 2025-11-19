import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const ADMIN_PASSWORD = 'admin2024'; // 本番環境では環境変数に移すことを推奨

export const EmaAdmin = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [emas, setEmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, likes
  const [editingEma, setEditingEma] = useState(null);
  const [editForm, setEditForm] = useState({ wish: '', name: '', likes: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // 認証チェック（localStorageに保存）
  useEffect(() => {
    const authStatus = localStorage.getItem('adminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      fetchEmas();
    } else {
      setLoading(false);
    }
  }, []);

  // 絵馬データを取得
  const fetchEmas = async () => {
    try {
      setLoading(true);
      const emasRef = collection(db, 'emas');
      const q = query(emasRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      const emasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.() || new Date(doc.data().created_at?.seconds * 1000)
      }));
      setEmas(emasData);
    } catch (error) {
      console.error('絵馬データの取得に失敗しました:', error);
      alert('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 認証処理
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      fetchEmas();
    } else {
      alert('パスワードが正しくありません');
      setPassword('');
    }
  };

  // ログアウト
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword('');
  };

  // 絵馬削除（単一）
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'emas', id));
      setEmas(emas.filter(ema => ema.id !== id));
      setDeleteConfirm(null);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      alert('絵馬を削除しました');
    } catch (error) {
      console.error('削除に失敗しました:', error);
      alert('削除に失敗しました');
    }
  };

  // 複数選択の切り替え
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 全選択/全解除
  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedEmas.length && filteredAndSortedEmas.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedEmas.map(ema => ema.id)));
    }
  };

  // 複数削除
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert('削除する絵馬を選択してください');
      return;
    }

    const deleteCount = selectedIds.size;
    if (!confirm(`${deleteCount}件の絵馬を削除してもよろしいですか？この操作は取り消せません。`)) {
      return;
    }

    try {
      const idsToDelete = Array.from(selectedIds);
      const deletePromises = idsToDelete.map(id => 
        deleteDoc(doc(db, 'emas', id))
      );
      await Promise.all(deletePromises);
      setEmas(emas.filter(ema => !selectedIds.has(ema.id)));
      setSelectedIds(new Set());
      alert(`${deleteCount}件の絵馬を削除しました`);
    } catch (error) {
      console.error('削除に失敗しました:', error);
      alert('削除に失敗しました');
    }
  };

  // 絵馬編集開始
  const handleEditStart = (ema) => {
    setEditingEma(ema.id);
    setEditForm({
      wish: ema.wish || '',
      name: ema.name || '',
      likes: ema.likes || 0
    });
  };

  // 絵馬編集保存
  const handleEditSave = async (id) => {
    try {
      const emaRef = doc(db, 'emas', id);
      await updateDoc(emaRef, {
        wish: editForm.wish,
        name: editForm.name,
        likes: parseInt(editForm.likes) || 0
      });
      await fetchEmas();
      setEditingEma(null);
      alert('更新しました');
    } catch (error) {
      console.error('更新に失敗しました:', error);
      alert('更新に失敗しました');
    }
  };

  // 絵馬編集キャンセル
  const handleEditCancel = () => {
    setEditingEma(null);
    setEditForm({ wish: '', name: '', likes: 0 });
  };

  // フィルタリングとソート
  const filteredAndSortedEmas = emas
    .filter(ema => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (ema.wish && ema.wish.toLowerCase().includes(term)) ||
        (ema.name && ema.name.toLowerCase().includes(term)) ||
        (ema.character?.name && ema.character.name.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return (a.created_at?.getTime() || 0) - (b.created_at?.getTime() || 0);
        case 'likes':
          return (b.likes || 0) - (a.likes || 0);
        case 'newest':
        default:
          return (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0);
      }
    });

  // 統計情報
  const stats = {
    total: emas.length,
    totalLikes: emas.reduce((sum, ema) => sum + (ema.likes || 0), 0),
    withCharacter: emas.filter(ema => ema.character).length
  };

  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center"
      >
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">管理者ログイン</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="パスワードを入力"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              ログイン
            </button>
          </form>
          {onBack && (
            <button
              onClick={onBack}
              className="w-full mt-4 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              戻る
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-gray-900 to-gray-800 overflow-y-auto"
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">絵馬管理画面</h1>
              <p className="text-gray-600">絵馬データの編集・削除ができます</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchEmas}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                更新
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ログアウト
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  戻る
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-gray-600">総絵馬数</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-2xl font-bold text-red-600">{stats.totalLikes}</div>
            <div className="text-gray-600">総いいね数</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-2xl font-bold text-blue-600">{stats.withCharacter}</div>
            <div className="text-gray-600">キャラクター選択済み</div>
          </div>
        </div>

        {/* 検索・ソート */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                検索
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="願い事、名前、キャラクター名で検索..."
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                並び替え
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="newest">新着順</option>
                <option value="oldest">古い順</option>
                <option value="likes">いいね順</option>
              </select>
            </div>
          </div>
        </div>

        {/* 複数選択・一括操作 */}
        {filteredAndSortedEmas.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  {selectedIds.size === filteredAndSortedEmas.length ? '全解除' : '全選択'}
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-gray-700 font-medium">
                    {selectedIds.size}件選択中
                  </span>
                )}
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  選択した{selectedIds.size}件を削除
                </button>
              )}
            </div>
          </div>
        )}

        {/* 絵馬一覧 */}
        {loading ? (
          <div className="text-center text-white text-xl py-8">読み込み中...</div>
        ) : filteredAndSortedEmas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 text-lg">絵馬が見つかりませんでした</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedEmas.map((ema) => (
              <div key={ema.id} className="bg-white rounded-lg shadow-lg p-6">
                {editingEma === ema.id ? (
                  // 編集モード
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        願い事
                      </label>
                      <textarea
                        value={editForm.wish}
                        onChange={(e) => setEditForm({ ...editForm, wish: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        rows="3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          名前
                        </label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          いいね数
                        </label>
                        <input
                          type="number"
                          value={editForm.likes}
                          onChange={(e) => setEditForm({ ...editForm, likes: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSave(ema.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        保存
                      </button>
                      <button
                        onClick={handleEditCancel}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  // 表示モード
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ema.id)}
                          onChange={() => handleToggleSelect(ema.id)}
                          className="mt-1 w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-sm text-gray-500 mb-1">
                            ID: {ema.id} | 
                            作成日: {ema.created_at ? ema.created_at.toLocaleString('ja-JP') : '不明'}
                          </div>
                          <div className="text-lg font-semibold text-gray-800 mb-2">
                            {ema.name || '（名前なし）'}
                          </div>
                          <div className="text-gray-700 whitespace-pre-wrap">
                            {ema.wish || '（願い事なし）'}
                          </div>
                          {ema.character && (
                            <div className="mt-2 text-sm text-blue-600">
                              キャラクター: {ema.character.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{ema.likes || 0}</div>
                          <div className="text-xs text-gray-500">いいね</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditStart(ema)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(ema.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 削除確認モーダル */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-gray-800 mb-4">削除確認</h2>
              <p className="text-gray-700 mb-6">
                この絵馬を削除してもよろしいですか？この操作は取り消せません。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  削除
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

