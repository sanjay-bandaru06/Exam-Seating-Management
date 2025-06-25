import React from 'react';
import { motion } from 'framer-motion';
import image from '../assets/AU.png';

const SplashPage = () => {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-tr from-indigo-900 via-black to-gray-900 overflow-hidden text-white">
      <ParticlesBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="z-10 text-center px-4 max-w-xl"
      >
        <motion.img
          src={image}
          alt="Logo"
          className="mx-auto w-52 mb-6 drop-shadow-lg" // Increased width from w-36 to w-52
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
      </motion.div>
    </div>
  );
};

const ParticlesBackground = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden">
    <div
      className="absolute top-0 left-1/3 w-1 h-1 bg-indigo-600 rounded-full animate-pulse"
      style={{ animationDelay: '0s' }}
    ></div>
    <div
      className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"
      style={{ animationDelay: '0.5s' }}
    ></div>
    <div
      className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-indigo-700 rounded-full animate-pulse"
      style={{ animationDelay: '1s' }}
    ></div>
  </div>
);

export default SplashPage;
