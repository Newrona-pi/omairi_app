import React from 'react';
import { motion } from 'framer-motion';

export const WishForm = ({ 
  wish, 
  setWish, 
  name, 
  setName, 
  handleWishSubmit, 
  inputRef, 
  isMobile 
}) => {
  return (
    <div className="fixed inset-0 flex justify-center items-end pb-10 pointer-events-none z-10">
      <motion.form
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        onSubmit={handleWishSubmit}
        className="p-4 rounded-lg shadow-lg w-full max-w-md bg-transparent pointer-events-auto"
      >
        <textarea
          ref={inputRef}
          className="block w-full p-2 mb-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-white text-black"
          rows="4"
          placeholder="願い事を入力してください（30文字まで）..."
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          maxLength={30}
          required
        ></textarea>
        <input
          type="text"
          className="block w-full p-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          placeholder="名前を入力してください（10文字まで）..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={10}
        />
        <button
          type="submit"
          className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition duration-300"
        >
          願い事を書く
        </button>
      </motion.form>
    </div>
  );
};

