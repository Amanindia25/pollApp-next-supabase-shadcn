'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { MenuIcon, X } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

const Navbar = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          setUser(null);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setUser(null);
        } else {
          setUser(profile as UserProfile);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setUser(null);
      }
    };

    fetchUserProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        return;
      }

      supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setUser(data as UserProfile);
          } else {
            console.error('Error in auth state change:', error);
            setUser(null);
          }
        });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black p-4 text-white shadow rounded-b-lg">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          {/* Add an icon here if you like */}
          pollApp
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {!user ? (
            <>
              <Button asChild variant="destructive">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild variant="destructive">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/polldashboard">Polls</Link>
              </Button>
              {user.role === 'admin' && (
                <Button asChild variant="ghost">
                  <Link href="/polldashboard/admin">Manage Polls</Link>
                </Button>
              )}
              <Button onClick={handleLogout} variant="destructive">
                Logout
              </Button>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-white text-black border-l border-gray-200">
              <div className="pt-8 flex flex-col gap-4">
                {!user ? (
                  <>
                    <Button asChild variant="outline" className="border-black text-black hover:bg-gray-100">
                      <Link href="/auth/signin">Sign In</Link>
                    </Button>
                    <Button asChild variant="default">
                      <Link href="/auth/signup">Sign Up</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="ghost">
                      <Link href="/polldashboard">Polls</Link>
                    </Button>
                    {user.role === 'admin' && (
                      <Button asChild variant="ghost">
                        <Link href="/managepolls">Manage Polls</Link>
                      </Button>
                    )}
                    <Button onClick={handleLogout} variant="destructive">
                      Logout
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
