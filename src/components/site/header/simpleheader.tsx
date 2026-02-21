import React from "react";
import Link from "next/link";
const SimpleHeader: React.FC = () => {
    return (
        <header className="bg-gray-800 text-white mb-12">
            <div className="container mx-auto flex justify-between items-center py-4 px-6">
                {/* Logo */}
                <div className="text-2xl font-bold">
                    <Link href="/" className="hover:text-gray-300">
                        NewsPortal
                    </Link>
                </div>

                {/* Navigation Menu */}
                <nav className="hidden md:flex space-x-6">
                    <a href="/world" className="hover:text-gray-300">
                        World
                    </a>
                    <a href="/politics" className="hover:text-gray-300">
                        Politics
                    </a>
                    <a href="/business" className="hover:text-gray-300">
                        Business
                    </a>
                    <a href="/technology" className="hover:text-gray-300">
                        Technology
                    </a>
                    <a href="/sports" className="hover:text-gray-300">
                        Sports
                    </a>
                </nav>

                {/* Social Media Icons */}
                <div className="flex space-x-4">
                    <a
                        href="https://facebook.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-300"
                    >
                        <i className="fab fa-facebook-f"></i>
                    </a>
                    <a
                        href="https://twitter.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-300"
                    >
                        <i className="fab fa-twitter"></i>
                    </a>
                    <a
                        href="https://instagram.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-300"
                    >
                        <i className="fab fa-instagram"></i>
                    </a>
                </div>

                {/* Mobile Menu Button */}
                <button className="md:hidden text-gray-300 focus:outline-none">
                    <i className="fas fa-bars"></i>
                </button>
            </div>
        </header>
    );
};

export default SimpleHeader;