import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { session, supabase } from './cloud';

const AccountContext = createContext<{user: User|null; ready: boolean; error: string}>({user:null,ready:false,error:''});

export function AccountProvider({children}:{children:ReactNode}) {
  const [user,setUser]=useState<User|null>(null), [ready,setReady]=useState(false), [error,setError]=useState('');
  useEffect(()=>{
    let mounted=true, received=false;
    const sub=supabase?.auth.onAuthStateChange((_event,next)=>{
      received=true;
      if(mounted){setUser(next?.user??null);setReady(true);setError('');}
    }).data.subscription;
    void session().then(next=>{if(mounted&&!received){setUser(next?.user??null);setReady(true);}})
      .catch(()=>{if(mounted&&!received){setError('Could not check your account. Open Account to try signing in.');setReady(true);}});
    return()=>{mounted=false;sub?.unsubscribe();};
  },[]);
  return <AccountContext.Provider value={{user,ready,error}}>{children}</AccountContext.Provider>;
}
export function useAccount(){return useContext(AccountContext);}
