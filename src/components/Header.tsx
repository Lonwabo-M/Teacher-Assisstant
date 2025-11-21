import React from 'react';
import { MenuIcon } from './icons/MenuIcon';

interface HeaderProps {
  onToggleSidebar: () => void;
  onLogoClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onLogoClick }) => {
  return (
    <header className="bg-white shadow-md sticky top-0 z-20">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between md:justify-center">
        <button onClick={onLogoClick} className="flex items-center cursor-pointer" aria-label="Go to homepage">
            <svg aria-label="LessonLab Logo" role="img" viewBox="0 0 185 32" className="h-8 w-auto">
                <g fill="#0000FF">
                    <circle cx="8" cy="8" r="6" />
                    <circle cx="26" cy="24" r="8" />
                </g>
                <text
                    x="42"
                    y="25"
                    fontFamily="sans-serif"
                    fontSize="24"
                    fontWeight="500"
                    fill="black"
                >
                    LessonLab
                </text>
            </svg>
        </button>

        <button 
          onClick={onToggleSidebar} 
          className="md:hidden p-2 rounded-md text-slate-500 hover:text-sky-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          aria-label="Open lesson history"
        >
          <MenuIcon />
        </button>
      </div>
    </header>
  );
};

export default Header;