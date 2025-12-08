"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ShieldCheck, AlertTriangle, FileText, CheckCircle, Globe } from "lucide-react"

export default function ComplianceCredits() {
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance & Credits</h1>
          <p className="text-slate-500">Manage regulatory obligations, CBAM certificates, and carbon credits</p>
        </div>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" /> Generate Report
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-50 border-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-800">Overall Compliance</p>
                <h3 className="text-2xl font-bold text-emerald-900">98%</h3>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-emerald-700 mb-1">
                <span>Audit Readiness</span>
                <span>High</span>
              </div>
              <Progress value={98} className="h-2 bg-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">CBAM Liability</p>
                <h3 className="text-2xl font-bold text-slate-900">€124,500</h3>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">Estimated for Q4 2025 based on current imports</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Actions</p>
                <h3 className="text-2xl font-bold text-slate-900">3</h3>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">2 Critical</Badge>
              <Badge variant="outline" className="bg-slate-50 text-slate-600">1 Warning</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regulations List */}
      <Card>
        <CardHeader>
          <CardTitle>Regulatory Frameworks</CardTitle>
          <CardDescription>Active monitoring for your operational regions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "EU CBAM", status: "Compliant", deadline: "30 Oct 2025", region: "Europe", impact: "High" },
              { name: "EU Battery Regulation", status: "In Progress", deadline: "15 Jan 2026", region: "Europe", impact: "Critical" },
              { name: "US Inflation Reduction Act", status: "Eligible", deadline: "Ongoing", region: "USA", impact: "Medium" },
              { name: "China Green Metal Standard", status: "Review Needed", deadline: "01 Dec 2025", region: "China", impact: "Medium" },
            ].map((reg, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${reg.status === 'Compliant' ? 'bg-emerald-500' : reg.status === 'In Progress' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                  <div>
                    <h4 className="font-medium text-slate-900">{reg.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{reg.region}</span>
                      <span>•</span>
                      <span>Deadline: {reg.deadline}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={reg.impact === 'Critical' ? 'destructive' : 'secondary'}>
                    {reg.impact} Impact
                  </Badge>
                  <Button size="sm" variant="ghost">Details</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
