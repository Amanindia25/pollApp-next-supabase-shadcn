// // src/components/navbar-footer/Navbar.tsx
// 'use client';

// import React, { useEffect, useState } from 'react';
// import Link from 'next/link';
// import { createClient } from '@/lib/supabase/client';
// import { Button } from '@/components/ui/button';
// import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
// import { MenuIcon } from 'lucide-react';

// interface UserProfile {
//   id: string;
//   email: string;
//   role: 'user' | 'admin';
// }

// const Navbar = () => {
//   const [user, setUser] = useState<UserProfile | null>(null);
//   const [loading, setLoading] = useState(true);
//   const supabase = createClient();

//   useEffect(() => {
//     const getSession = async () => {
//       const { data: { session }, error } = await supabase.auth.getSession();
//       if (error) {
//         console.error('Error fetching session:', error);
//         setLoading(false);
//         return;
//       }

//       if (session) {
//         const { data: profileData, error: profileError } = await supabase
//           .from('profiles')
//           .select('id, email, role')
//           .eq('id', session.user.id)
//           .single();

//         if (profileError) {
//           console.error('Error fetching profile:', profileError);
//           setUser(null);
//         } else {
//           setUser(profileData as UserProfile);
//         }
//       }
//       setLoading(false);{
//         setUser(null);
//       }
//       setLoading(false);
//     };

//     getSession();

//     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
//       if (session) {
//         const getProfile = async () => {
//           const { data: profileData, error: profileError } = await supabase
//             .from('profiles')
//             .select('id, email, role')
//             .eq('id', session.user.id)
//             .single();

//           if (profileError) {
//             console.error('Error fetching profile on auth change:', profileError);
//             setUser(null);
//           } else {
//             setUser(profileData as UserProfile);
//           }
//         };
//         getProfile();
//       } else {
//         setUser(null);
//       }
//     });

//     return () => {
//       subscription.unsubscribe();
//     };
//   }, []);

//   const handleLogout = async () => {
//     setLoading(true);
//     const { error } = await supabase.auth.signOut();
//     if (error) {
//       console.error('Error logging out:', error);
//     }
//     setUser(null);
//     setLoading(false);
//   };

//   if (loading) {
//     return (
//       <nav className="bg-gray-800 p-4 text-white">
//         <div className="container mx-auto flex justify-between items-center">
//           <div className="text-lg font-bold">PollApp</div>
//           <div>Loading...</div>
//         </div>
//       </nav>
//     );
//   }

//   return (
//     <nav className="bg-gray-800 p-4 text-white">
//       <div className="container mx-auto flex justify-between items-center">
//         <Link href="/" className="flex items-center space-x-2">
//           {/* Add your app logo here if available */}
//           <span className="text-lg font-bold">PollApp</span>
//         </Link>

//         {/* Desktop Navigation */}
//         <div className="hidden md:flex items-center space-x-4">
//           {!user ? (
//             <>
//               <Button asChild variant="ghost">
//                 <Link href="/auth/signin">Sign In</Link>
//               </Button>
//               <Button asChild variant="default">
//                 <Link href="/auth/signup">Sign Up</Link>
//               </Button>
//             </>
//           ) : (
//             <>
//               <Button asChild variant="ghost">
//                 <Link href="/polldashboard">Polls</Link>
//               </Button>
//               {user.role === 'admin' && (
//                 <Button asChild variant="ghost">
//                   <Link href="/managepolls">Manage Polls</Link>
//                 </Button>
//               )}
//               <Button onClick={handleLogout} variant="destructive">
//                 Logout
//               </Button>
//             </>
//           )}
//         </div>

//         {/* Mobile Navigation */}
//         <div className="md:hidden">
//           <Sheet>
//             <SheetTrigger asChild>
//               <Button variant="ghost" size="icon">
//                 <MenuIcon className="h-6 w-6" />
//               </Button>
//             </SheetTrigger>
//             <SheetContent side="right" className="bg-gray-800 text-white">
//               <div className="flex flex-col space-y-4 pt-8">
//                 {!user ? (
//                   <>
//                     <Button asChild variant="ghost">
//                       <Link href="/auth/signin">Sign In</Link>
//                     </Button>
//                     <Button asChild variant="default">
//                       <Link href="/auth/signup">Sign Up</Link>
//                     </Button>
//                   </>
//                 ) : (
//                   <>
//                     <Button asChild variant="ghost">
//                       <Link href="/polldashboard">Polls</Link>
//                     </Button>
//                     {user.role === 'admin' && (
//                       <Button asChild variant="ghost">
//                         <Link href="/managepolls">Manage Polls</Link>
//                       </Button>
//                     )}
//                     <Button onClick={handleLogout} variant="destructive">
//                       Logout
//                     </Button>
//                   </>
//                 )}
//               </div>
//             </SheetContent>
//           </Sheet>
//         </div>
//       </div>
//     </nav>
//   );
// };

// export default Navbar;


//------------------------
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { MenuIcon } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

const Navbar = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const supabase = createClient();

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
    <nav className="bg-gray-800 p-4 text-white shadow">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          {/* Add an icon here if you like */}
          pollApp
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {!user ? (
            <>
              <Button asChild variant="ghost">
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
            <SheetContent side="right" className="bg-gray-800 text-white">
              <div className="pt-8 flex flex-col gap-4">
                {!user ? (
                  <>
                    <Button asChild variant="ghost">
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
