import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ServicePackages from "@/components/ServicePackages";
import CustomQuoteForm from "@/components/CustomQuoteForm";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, X } from "lucide-react";

export default function Services() {
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">Our Service Packages</h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Choose from our carefully crafted packages or request a custom solution tailored to your unique needs.
          </p>
        </div>

        {/* Service Packages */}
        <ServicePackages />

        {/* Package Comparison Table */}
        <div className="mt-16 bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Features</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">Launch</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 bg-blue-50">Growth</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">Elite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">Pages Included</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">Up to 5</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center bg-blue-50">Up to 10</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">Mobile Responsive</td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center bg-blue-50"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">E-commerce Integration</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center bg-blue-50"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><CheckCircle className="w-5 h-5 text-green-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">Custom Features</td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-slate-300 mx-auto" /></td>
                  <td className="px-6 py-4 text-center bg-blue-50">Basic</td>
                  <td className="px-6 py-4 text-center">Advanced</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">Support Period</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">3 Months</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center bg-blue-50">6 Months</td>
                  <td className="px-6 py-4 text-sm text-slate-600 text-center">12 Months</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom Quote Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 lg:p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Need Something Custom?</h2>
          <p className="text-xl text-blue-100 mb-8">Get a personalized quote for your unique project requirements</p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={() => setShowQuoteForm(true)}
            className="px-8 py-4 text-lg"
          >
            Request Custom Quote
          </Button>
        </div>
      </div>

      {/* Custom Quote Modal */}
      {showQuoteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-900">Request Custom Quote</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowQuoteForm(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <CustomQuoteForm onClose={() => setShowQuoteForm(false)} />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}