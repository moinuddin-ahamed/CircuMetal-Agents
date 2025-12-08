"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff } from "lucide-react"

interface UserSettings {
  name: string
  email: string
  theme: "dark" | "light" | "system"
  defaultRegion: string
  massUnit: "kg" | "tonne"
  distanceUnit: "km" | "miles"
  timezone: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    name: "John Doe",
    email: "john@acme.com",
    theme: "dark",
    defaultRegion: "Europe",
    massUnit: "tonne",
    distanceUnit: "km",
    timezone: "UTC",
  })

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
    showCurrent: false,
    showNew: false,
    showConfirm: false,
  })

  const [savedMessage, setSavedMessage] = useState("")

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = () => {
    setSavedMessage("Settings saved successfully!")
    setTimeout(() => setSavedMessage(""), 3000)
  }

  return (
    <div className="h-full p-8 space-y-6 overflow-auto bg-gradient-to-br from-white via-emerald-50/20 to-white">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1 font-medium">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="account" className="w-full animate-slide-up" style={{ animationDelay: '100ms' }}>
        <TabsList className="grid w-full grid-cols-3 bg-slate-100/80 p-1 rounded-xl">
          <TabsTrigger value="account" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 transition-all">Account</TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 transition-all">Preferences</TabsTrigger>
          <TabsTrigger value="data-models" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700 transition-all">Data & Models</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6 mt-6">
          <Card className="p-6 bg-white border-slate-100 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Account Information</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Name</label>
                <Input
                  value={settings.name}
                  onChange={(e) => handleSettingChange("name", e.target.value)}
                  className="bg-slate-50 text-slate-700 border-slate-100 rounded-xl focus:border-emerald-300 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Email</label>
                <Input value={settings.email} disabled className="bg-slate-100 text-slate-500 border-slate-100 rounded-xl" />
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange("timezone", e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-100 rounded-xl text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                >
                  <option>UTC</option>
                  <option>EST</option>
                  <option>CST</option>
                  <option>MST</option>
                  <option>PST</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Change Password Section */}
          <Card className="p-6 bg-white border-slate-100 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Change Password</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Current Password</label>
                <div className="relative">
                  <Input
                    type={passwordForm.showCurrent ? "text" : "password"}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    className="bg-slate-50 text-slate-700 border-slate-100 pr-10 rounded-xl focus:border-emerald-300 focus:ring-emerald-100"
                  />
                  <button
                    onClick={() => setPasswordForm((prev) => ({ ...prev, showCurrent: !prev.showCurrent }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {passwordForm.showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">New Password</label>
                <div className="relative">
                  <Input
                    type={passwordForm.showNew ? "text" : "password"}
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    className="bg-slate-50 text-slate-700 border-slate-100 pr-10 rounded-xl focus:border-emerald-300 focus:ring-emerald-100"
                  />
                  <button
                    onClick={() => setPasswordForm((prev) => ({ ...prev, showNew: !prev.showNew }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {passwordForm.showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type={passwordForm.showConfirm ? "text" : "password"}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    className="bg-slate-50 text-slate-700 border-slate-100 pr-10 rounded-xl focus:border-emerald-300 focus:ring-emerald-100"
                  />
                  <button
                    onClick={() => setPasswordForm((prev) => ({ ...prev, showConfirm: !prev.showConfirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {passwordForm.showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white w-full rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.01]">Update Password</Button>
            </div>
          </Card>

          <Button
            onClick={handleSaveSettings}
            className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white w-full rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.01]"
          >
            Save Changes
          </Button>

          {savedMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium animate-slide-up">
              {savedMessage}
            </div>
          )}
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6 mt-6">
          <Card className="p-6 bg-white border-slate-100 rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">UI Preferences</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-2 block">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange("theme", e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-100 rounded-xl text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">LCA Defaults</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Default Region</label>
                <select
                  value={settings.defaultRegion}
                  onChange={(e) => handleSettingChange("defaultRegion", e.target.value)}
                  className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                >
                  <option>Europe</option>
                  <option>Asia-Pacific</option>
                  <option>North America</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Mass Unit</label>
                <select
                  value={settings.massUnit}
                  onChange={(e) => handleSettingChange("massUnit", e.target.value as "kg" | "tonne")}
                  className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="tonne">Tonne (t)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Distance Unit</label>
                <select
                  value={settings.distanceUnit}
                  onChange={(e) => handleSettingChange("distanceUnit", e.target.value as "km" | "miles")}
                  className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                >
                  <option value="km">Kilometers (km)</option>
                  <option value="miles">Miles (mi)</option>
                </select>
              </div>
            </div>
          </Card>

          <Button
            onClick={handleSaveSettings}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
          >
            Save Preferences
          </Button>
        </TabsContent>

        {/* Data & Models Tab */}
        <TabsContent value="data-models" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">LCA Data Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">LCI Database Version</label>
                <select className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors">
                  <option>v1.0 (Current)</option>
                  <option>v0.9</option>
                  <option>v0.8</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Emission Factor Set</label>
                <select className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors">
                  <option>Grid Mix (Current)</option>
                  <option>Coal Heavy</option>
                  <option>Renewable Heavy</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-input rounded-lg border border-border">
                <label className="text-sm font-medium text-foreground">Allow overriding database values</label>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">AI / LLM Settings</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-input rounded-lg border border-border">
                <label className="text-sm font-medium text-foreground">Enable AI-assisted prediction</label>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Confidence Threshold</label>
                <input type="range" min="0" max="100" defaultValue="75" className="w-full" />
                <p className="text-xs text-muted-foreground mt-1">≥ 75% confidence to auto-accept</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">LLM Model</label>
                <select className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors">
                  <option>gpt-4.1-mini</option>
                  <option>gpt-5.1</option>
                  <option>claude-opus</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Max Tokens per Call</label>
                <Input type="number" defaultValue="2000" className="bg-input text-foreground border-border" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Database Configuration</h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Database Type</p>
                <p className="text-sm text-foreground font-medium">PostgreSQL</p>
                <p className="text-xs text-muted-foreground mt-1">Configured at deployment (admin only)</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Connection Profile</p>
                <p className="text-sm text-foreground font-medium">prod-sql</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Connection String</p>
                <p className="text-sm text-foreground font-mono bg-input p-2 rounded border border-border">
                  postgres://*****@host:5432/db_name
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
