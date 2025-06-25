import React from 'react';
import { motion } from 'framer-motion';
import image from '../assets/aditya-university.webp';
import './SplashPage.css';

const SplashPage = () => {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-tr from-indigo-950 via-gray-900 to-black overflow-hidden text-white font-poppins">
      <ParticlesBackground />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="z-10 text-center px-4 max-w-3xl"
      >
        {/* Logo Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, type: 'spring', stiffness: 60 }}
          className="relative"
        >
          <motion.img
            src={image}
            alt="Aditya University Logo"
            className="mx-auto w-44 md:w-56 mb-6 drop-shadow-xl rounded-md"
            whileHover={{ scale: 1.03 }}
          />
          <motion.div 
            className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 -z-10 mx-auto w-32 md:w-44"
            animate={{ opacity: [0.2, 0.35, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Main Heading */}
        <motion.h1 className="text-2xl md:text-4xl font-light tracking-wide mb-4 leading-snug  text-indigo-200">
          {["Exam", "Seating", "Management"].map((word, wi) => (
            <motion.span
              key={wi}
              className="block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + wi * 0.12, duration: 0.6, type: 'spring' }}
            >
              {word.split("").map((char, ci) => (
                <motion.span
                  key={ci}
                  className="inline-block"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.7 + wi * 0.12 + ci * 0.02,
                    duration: 0.5,
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.span>
          ))}
        </motion.h1>

        {/* Subheading */}
        <motion.p
          className="text-sm md:text-base text-indigo-300 max-w-xl mx-auto mt-3 font-light"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          Organizing examinations with ease, accuracy, and elegance.
        </motion.p>

        {/* Animated Loading Bar */}
        <motion.div
          className="mt-10 h-1.5 bg-white/10 rounded-full overflow-hidden max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-400 via-purple-500 to-indigo-400 shimmer"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 1.9, duration: 2.5, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

const ParticlesBackground = () => {
  const particles = Array.from({ length: 40 }).map((_, i) => {
    const size = Math.random() * 2 + 1;
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 4 + Math.random() * 3;

    return (
      <motion.div
        key={i}
        className="absolute rounded-full bg-gradient-to-br from-indigo-400 to-purple-500"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          left: `${posX}%`,
          top: `${posY}%`,
          opacity: 0.4,
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.4, 0],
          y: [0, -15],
          x: [0, Math.random() > 0.5 ? 8 : -8],
        }}
        transition={{
          delay,
          duration,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    );
  });

  return (
    <div className="absolute inset-0 overflow-hidden -z-10">
      {particles}
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          background: [
            'radial-gradient(circle at 70% 30%, rgba(99, 102, 241, 0.5), transparent 50%)',
            'radial-gradient(circle at 30% 80%, rgba(139, 92, 246, 0.5), transparent 50%)',
            'radial-gradient(circle at 70% 30%, rgba(99, 102, 241, 0.5), transparent 50%)',
          ],
        }}
        transition={{ duration: 18, repeat: Infinity }}
      />
    </div>
  );
};

export default SplashPage;
