import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Shield, Lock, Mail, ChevronRight, Rocket } from 'lucide-react';

interface AuthProps {
  onLogin: (user: { email: string }) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      }
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', { email, password });
      toast.success('Registration successful! Please login.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center space-y-2">
        <div className="bg-[#141414] w-16 h-16 rounded-none flex items-center justify-center mx-auto rotate-3 shadow-[4px_4px_0px_0px_rgba(20,20,20,0.2)]">
          <Rocket className="w-8 h-8 text-[#E4E3E0]" />
        </div>
        <h1 className="text-4xl font-bold tracking-tighter uppercase italic font-serif pt-4">Vortex Deploy</h1>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Professional VPS Orchestration</p>
      </div>

      <Card className="border-[#141414] bg-white rounded-none shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] overflow-hidden">
        <CardHeader className="border-b border-[#141414] p-8 pb-6 bg-[#141414]/5">
          <CardTitle className="text-xl font-bold tracking-tight uppercase italic font-serif flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Gateway
          </CardTitle>
          <CardDescription className="text-[10px] font-mono uppercase tracking-widest opacity-60">Identity verification required to access infrastructure</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-transparent border border-[#141414] rounded-none p-1 mb-8">
              <TabsTrigger value="login" className="rounded-none data-[state=active]:bg-[#141414] data-[state=active]:text-[#E4E3E0] font-mono text-[10px] uppercase tracking-widest py-2">Login</TabsTrigger>
              <TabsTrigger value="register" className="rounded-none data-[state=active]:bg-[#141414] data-[state=active]:text-[#E4E3E0] font-mono text-[10px] uppercase tracking-widest py-2">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Email Address
                  </Label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    placeholder="admin@vortex.io"
                    className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Password
                  </Label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder="••••••••"
                    className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none font-mono text-[10px] uppercase tracking-widest h-14 group">
                  {loading ? 'Authenticating...' : 'Access Dashboard'}
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Email Address
                  </Label>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono uppercase tracking-widest opacity-60 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Password
                  </Label>
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="border-[#141414] bg-white rounded-none h-12 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90 rounded-none font-mono text-[10px] uppercase tracking-widest h-14 group">
                  {loading ? 'Creating...' : 'Create Account'}
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <p className="text-center text-[9px] font-mono uppercase tracking-widest opacity-30">
        &copy; 2026 Vortex Deploy Systems. All rights reserved.
      </p>
    </div>
  );
}
