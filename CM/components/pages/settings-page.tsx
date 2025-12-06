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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="data-models">Data & Models</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Account Information</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Name</label>
                <Input
                  value={settings.name}
                  onChange={(e) => handleSettingChange("name", e.target.value)}
                  className="bg-input text-foreground border-border"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
                <Input value={settings.email} disabled className="bg-input text-muted-foreground border-border" />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange("timezone", e.target.value)}
                  className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
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
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Change Password</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Current Password</label>
                <div className="relative">
                  <Input
                    type={passwordForm.showCurrent ? "text" : "password"}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    className="bg-input text-foreground border-border pr-10"
                  />
                  <button
                    onClick={() => setPasswordForm((prev) => ({ ...prev, showCurrent: !prev.showCurrent }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {passwordForm.showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">New Password</label>
                <div className="relative">
                  <Input
                    type={passwordForm.showNew ? "text" : "password"}
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                    className="bg-input text-foreground border-border pr-10"
                  />
                  <button
                    onClick={() => setPasswordForm((prev) => ({ ...prev, showNew: !prev.showNew }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {passwordForm.showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type={passwordForm.showConfirm ? "text" : "password"}
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                    className="bg-input text-foreground border-border pr-10"
                  />
                  <button
                    onClick={() => setPasswordForm((prev) => ({ ...prev, showConfirm: !prev.showConfirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {passwordForm.showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">Update Password</Button>
            </div>
          </Card>

          <Button
            onClick={handleSaveSettings}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
          >
            Save Changes
          </Button>

          {savedMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-700">
              {savedMessage}
            </div>
          )}
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6 mt-6">
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">UI Preferences</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange("theme", e.target.value)}
                  className="w-full px-3 py-2 bg-input text-foreground border border-border rounded-lg text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
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
