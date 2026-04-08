import React from 'react';
import { Settings as SettingsIcon, User, Shield, Database, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function Settings({ userEmail }: { userEmail: string }) {
  const [loading, setLoading] = React.useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Settings saved successfully');
    }, 1000);
  };

  return (
    <div className="space-y-12 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight font-serif italic mb-2">Settings</h2>
        <p className="text-sm opacity-60">Manage your account and platform configuration.</p>
      </div>

      <div className="grid gap-12">
        {/* Profile Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[#141414] pb-2">
            <User className="w-5 h-5 opacity-50" />
            <h3 className="text-lg font-bold uppercase tracking-tight italic">Profile</h3>
          </div>
          
          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest opacity-50">Email Address</Label>
              <Input 
                id="email" 
                value={userEmail} 
                disabled 
                className="border-[#141414] rounded-none bg-white/50 font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs uppercase tracking-widest opacity-50">Display Name</Label>
              <Input 
                id="name" 
                placeholder="Enter your name" 
                className="border-[#141414] rounded-none bg-white font-mono text-xs focus-visible:ring-[#141414]"
              />
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[#141414] pb-2">
            <Shield className="w-5 h-5 opacity-50" />
            <h3 className="text-lg font-bold uppercase tracking-tight italic">Security</h3>
          </div>
          
          <div className="grid gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-pass" className="text-xs uppercase tracking-widest opacity-50">Current Password</Label>
              <Input 
                id="current-pass" 
                type="password" 
                className="border-[#141414] rounded-none bg-white font-mono text-xs focus-visible:ring-[#141414]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pass" className="text-xs uppercase tracking-widest opacity-50">New Password</Label>
              <Input 
                id="new-pass" 
                type="password" 
                className="border-[#141414] rounded-none bg-white font-mono text-xs focus-visible:ring-[#141414]"
              />
            </div>
            <Button variant="outline" className="border-[#141414] rounded-none uppercase tracking-widest text-[10px] font-bold w-fit">
              Update Password
            </Button>
          </div>
        </section>

        {/* Database Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[#141414] pb-2">
            <Database className="w-5 h-5 opacity-50" />
            <h3 className="text-lg font-bold uppercase tracking-tight italic">Database</h3>
          </div>
          
          <div className="p-6 border border-[#141414] bg-white/50 flex items-center justify-between">
            <div>
              <p className="font-bold uppercase tracking-tight text-sm mb-1">MongoDB Atlas</p>
              <p className="text-xs opacity-60 font-mono">cluster0.9mdfive.mongodb.net/vpn_setup</p>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Connected</span>
            </div>
          </div>
        </section>

        {/* API Keys Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[#141414] pb-2">
            <Key className="w-5 h-5 opacity-50" />
            <h3 className="text-lg font-bold uppercase tracking-tight italic">API Keys</h3>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border border-[#141414] bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#141414] p-2 rounded-sm">
                  <Key className="w-4 h-4 text-[#E4E3E0]" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-tight">Main Platform Key</p>
                  <p className="text-[10px] font-mono opacity-40">Created on April 06, 2026</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] rounded-none">
                Revoke
              </Button>
            </div>
            <Button className="bg-[#141414] text-[#E4E3E0] rounded-none uppercase tracking-widest text-[10px] font-bold w-full max-w-md py-6">
              Generate New API Key
            </Button>
          </div>
        </section>
      </div>

      <div className="sticky bottom-6 flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={loading}
          className="bg-[#141414] text-[#E4E3E0] rounded-none px-12 py-6 uppercase tracking-widest font-bold shadow-xl hover:scale-105 transition-transform"
        >
          {loading ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
