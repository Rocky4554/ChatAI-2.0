import React from 'react';
import {Link} from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden flex justify-center items-center">
      {/* Glowing background elements */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-b from-purple-600 to-transparent opacity-60 blur-[60px] top-[-100px] left-[-100px] animate-float-15"></div>
      <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-b from-emerald-500 to-transparent opacity-60 blur-[60px] bottom-[-50px] right-[-50px] animate-float-12-reverse"></div>
      <div className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-b from-blue-500 to-transparent opacity-60 blur-[60px] top-1/2 left-[70%] animate-float-10"></div>
      
      {/* Content */}
      <div className="relative z-10 text-center px-8 max-w-4xl">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          <span className="bg-gradient-to-r from-purple-600 via-blue-500 to-emerald-500 bg-clip-text text-transparent bg-[length:200%_200%] animate-gradient-shift">Chat</span>,<span className="bg-gradient-to-r from-purple-600 via-blue-500 to-emerald-500 bg-clip-text text-transparent bg-[length:200%_200%] animate-gradient-shift">Collaborate</span> and <span className="bg-gradient-to-r from-purple-600 via-blue-500 to-emerald-500 bg-clip-text text-transparent bg-[length:200%_200%] animate-gradient-shift">Create</span> things using AI
        </h1>
        <p className="text-xl text-gray-300 mb-10">Unlock the power of artificial intelligence for your creative projects</p>
        <Link to="/login">
        <button className="relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full text-white font-bold text-lg overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/50">
          <span className="relative z-10">Let's Start</span>
          <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></span>
        </button>
        </Link>
      </div>
      
      {/* Add the animation keyframes to your Tailwind config or global CSS */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-float-15 { animation: float 15s infinite ease-in-out; }
        .animate-float-12-reverse { animation: float 12s infinite ease-in-out reverse; }
        .animate-float-10 { animation: float 10s infinite ease-in-out; }
        .animate-gradient-shift { animation: gradient-shift 8s ease infinite; }
      `}</style>
    </div>
  );
};

export default LandingPage;