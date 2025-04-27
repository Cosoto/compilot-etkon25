import dynamic from 'next/dynamic';
import ProtectedRoute from '@/components/ProtectedRoute';

const CompanyStructure = dynamic(() => import('@/components/company/CompanyStructure'), { loading: () => <div className="p-8 text-center">Loading company structure...</div> });
const StationsView = dynamic(() => import('@/components/company/StationsView'), { loading: () => <div className="p-8 text-center">Loading stations...</div> });

export default function CompanyPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">Company Management</h1>
        
        <section className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-gray-700">Structure Overview</h2>
          <CompanyStructure />
        </section>

        <section className="bg-white shadow-lg rounded-lg p-6">
           <h2 className="text-2xl font-semibold mb-4 text-gray-700">Stations</h2>
           <StationsView /> 
        </section>

      </div>
    </ProtectedRoute>
  );
} 