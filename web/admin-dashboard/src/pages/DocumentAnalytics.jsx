import React, { useState, useEffect } from 'react';
import { formatNumber, formatPercent, formatDate } from '../utils/formatters';
import BarChart from '../components/charts/BarChart';
import PieChart from '../components/charts/PieChart';
import StatCard from '../components/dashboard/StatCard';
import LineChart from '../components/charts/LineChart';
import AnalyticsService from '../services/analytics.service';

const DocumentAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');
  const [documentData, setDocumentData] = useState({
    statusData: { labels: [], data: [] },
    typeData: { labels: [], data: [] },
    totalDocuments: 0,
    averageVerificationTime: 0
  });
  
  const [documentTrends, setDocumentTrends] = useState({
    labels: [],
    uploads: [],
    approvals: [],
    rejections: []
  });
  
  const [documentMetrics, setDocumentMetrics] = useState({
    totalUploads: 0,
    pendingDocuments: 0,
    approvalRate: 0,
    rejectionRate: 0,
    avgProcessingTime: 0,
    expiredDocuments: 0
  });

  // Fetch data when timeframe changes
  useEffect(() => {
    const fetchDocumentData = async () => {
      setLoading(true);
      try {
        const response = await AnalyticsService.getDocumentAnalytics(timeframe);
        
        if (response.success && response.data) {
          setDocumentData(response.data);
          
          // Calculate additional metrics
          const pending = response.data.statusData.data[
            response.data.statusData.labels.findIndex(label => label === 'Pending')
          ] || 0;
          
          const approved = response.data.statusData.data[
            response.data.statusData.labels.findIndex(label => label === 'Verified')
          ] || 0;
          
          const rejected = response.data.statusData.data[
            response.data.statusData.labels.findIndex(label => label === 'Rejected')
          ] || 0;
          
          const expired = response.data.statusData.data[
            response.data.statusData.labels.findIndex(label => label === 'Expired')
          ] || 0;
          
          const totalProcessed = approved + rejected;
          
          setDocumentMetrics({
            totalUploads: response.data.totalDocuments,
            pendingDocuments: pending,
            approvalRate: totalProcessed > 0 ? approved / totalProcessed : 0,
            rejectionRate: totalProcessed > 0 ? rejected / totalProcessed : 0,
            avgProcessingTime: response.data.averageVerificationTime,
            expiredDocuments: expired
          });
        }
      } catch (error) {
        console.error('Error fetching document analytics:', error);
      }
      
      // Simulate document trends data until we have a real API
      simulateDocumentTrends(timeframe);
      
      setLoading(false);
    };
    
    fetchDocumentData();
  }, [timeframe]);
  
  // Simulate document trends data
  const simulateDocumentTrends = (timeframe) => {
    let labels = [];
    const uploads = [];
    const approvals = [];
    const rejections = [];
    
    let dataPoints = 0;
    
    switch (timeframe) {
      case 'day':
        dataPoints = 24;
        for (let i = 0; i < dataPoints; i++) {
          labels.push(`${i}:00`);
        }
        break;
      case 'week':
        dataPoints = 7;
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        break;
      case 'month':
        dataPoints = 30;
        for (let i = 1; i <= dataPoints; i++) {
          labels.push(`Day ${i}`);
        }
        break;
      case 'year':
        dataPoints = 12;
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        break;
      default:
        dataPoints = 30;
        for (let i = 1; i <= dataPoints; i++) {
          labels.push(`Day ${i}`);
        }
    }
    
    // Generate realistic data
    for (let i = 0; i < dataPoints; i++) {
      // More uploads on weekdays
      const isWeekend = timeframe === 'week' && (i === 5 || i === 6);
      const dayFactor = isWeekend ? 0.6 : 1;
      
      // Uploads
      const baseUploads = Math.floor(Math.random() * 10) + 5;
      uploads.push(Math.floor(baseUploads * dayFactor));
      
      // Approvals (generally fewer than uploads, with a delay)
      const baseApprovals = Math.floor(Math.random() * 8) + 3;
      approvals.push(Math.floor(baseApprovals * dayFactor));
      
      // Rejections (fewer than approvals)
      const baseRejections = Math.floor(Math.random() * 4) + 1;
      rejections.push(Math.floor(baseRejections * dayFactor));
    }
    
    setDocumentTrends({
      labels,
      uploads,
      approvals,
      rejections
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Document Upload Analytics</h1>
        
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-md ${timeframe === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTimeframe('day')}
          >
            Day
          </button>
          <button
            className={`px-4 py-2 rounded-md ${timeframe === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTimeframe('week')}
          >
            Week
          </button>
          <button
            className={`px-4 py-2 rounded-md ${timeframe === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTimeframe('month')}
          >
            Month
          </button>
          <button
            className={`px-4 py-2 rounded-md ${timeframe === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setTimeframe('year')}
          >
            Year
          </button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Document Uploads"
          value={documentMetrics.totalUploads}
          icon="📄"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          loading={loading}
        />
        <StatCard
          title="Pending Documents"
          value={documentMetrics.pendingDocuments}
          icon="⏳"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          loading={loading}
        />
        <StatCard
          title="Approval Rate"
          value={documentMetrics.approvalRate}
          format="percent"
          icon="✅"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          loading={loading}
        />
        <StatCard
          title="Avg. Processing Time"
          value={documentMetrics.avgProcessingTime}
          suffix=" min"
          icon="⏱️"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          loading={loading}
        />
      </div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Document Upload Status</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <PieChart
              data={documentData.statusData.data}
              labels={documentData.statusData.labels}
              title=""
              height={320}
              doughnut={true}
              cutout="70%"
            />
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Document Types</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <BarChart
              data={documentData.typeData.data}
              labels={documentData.typeData.labels}
              title=""
              height={320}
              horizontal={true}
            />
          )}
        </div>
      </div>
      
      {/* Document Trends */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-4">Document Processing Trends</h3>
          {loading ? (
            <div className="h-80 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <LineChart
              data={[documentTrends.uploads, documentTrends.approvals, documentTrends.rejections]}
              labels={[documentTrends.labels, ['Uploads', 'Approvals', 'Rejections']]}
              title=""
              height={350}
              tension={0.3}
              colors={['#3b82f6', '#10b981', '#ef4444']}
            />
          )}
        </div>
      </div>
      
      {/* Processing Efficiency Matrix */}
      <div className="mb-8 bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-4">Processing Efficiency</h3>
        {loading ? (
          <div className="h-48 bg-gray-100 animate-pulse rounded"></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Verification Success</h4>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {formatPercent(documentMetrics.approvalRate)}
                </span>
                <span className="text-sm text-gray-500">approval rate</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {documentMetrics.approvalRate > 0.8 ? 'Excellent' : documentMetrics.approvalRate > 0.6 ? 'Good' : 'Needs improvement'}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Rejection Analysis</h4>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-red-600">
                  {formatPercent(documentMetrics.rejectionRate)}
                </span>
                <span className="text-sm text-gray-500">rejection rate</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {documentMetrics.rejectionRate < 0.1 ? 'Very low' : documentMetrics.rejectionRate < 0.2 ? 'Acceptable' : 'High'}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Processing Time</h4>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-purple-600">
                  {documentMetrics.avgProcessingTime}
                </span>
                <span className="text-sm text-gray-500">minutes</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {documentMetrics.avgProcessingTime < 30 ? 'Excellent' : documentMetrics.avgProcessingTime < 60 ? 'Good' : 'Slow'}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Pending Documents</h4>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-yellow-600">
                  {formatNumber(documentMetrics.pendingDocuments)}
                </span>
                <span className="text-sm text-gray-500">in queue</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {documentMetrics.pendingDocuments < 10 ? 'Low backlog' : documentMetrics.pendingDocuments < 30 ? 'Moderate backlog' : 'High backlog'}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Rejection Rate"
          value={documentMetrics.rejectionRate}
          format="percent"
          icon="❌"
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          loading={loading}
        />
        <StatCard
          title="Expired Documents"
          value={documentMetrics.expiredDocuments}
          icon="⏱️"
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
          loading={loading}
        />
        <StatCard
          title="Document Backlog"
          value={documentMetrics.pendingDocuments}
          icon="📚"
          iconBgColor="bg-gray-100"
          iconColor="text-gray-600"
          loading={loading}
        />
        <StatCard
          title="Avg. Queue Time"
          value={documentMetrics.avgProcessingTime * 0.8}
          suffix=" min"
          icon="⌛"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          loading={loading}
        />
      </div>
      
      {/* Document Verification Recommendations */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
        <h3 className="text-lg font-semibold mb-4">Document Verification Process Insights</h3>
        
        {loading ? (
          <div className="h-32 bg-gray-100 animate-pulse rounded"></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="bg-blue-100 text-blue-800 p-2 rounded-full">💡</span>
              <div>
                <h4 className="font-medium">Verification Efficiency</h4>
                <p className="text-gray-600 text-sm">
                  {documentMetrics.avgProcessingTime < 30 
                    ? "Excellent verification speed. Current process is working well." 
                    : documentMetrics.avgProcessingTime < 60
                    ? "Good verification speed, but consider additional verification resources during peak hours."
                    : "Slow verification times. Consider adding more staff or optimizing the verification workflow."}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-green-100 text-green-800 p-2 rounded-full">📊</span>
              <div>
                <h4 className="font-medium">Document Quality</h4>
                <p className="text-gray-600 text-sm">
                  {documentMetrics.rejectionRate < 0.15
                    ? "Low rejection rate indicates good document quality and clear submission guidelines."
                    : documentMetrics.rejectionRate < 0.25
                    ? "Moderate rejection rate. Consider improving submission guidelines."
                    : "High rejection rate. Improve document submission guidelines and provide examples of acceptable documents."}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="bg-yellow-100 text-yellow-800 p-2 rounded-full">⚠️</span>
              <div>
                <h4 className="font-medium">Processing Backlog</h4>
                <p className="text-gray-600 text-sm">
                  {documentMetrics.pendingDocuments < 10
                    ? "Low document backlog. Current staffing is adequate."
                    : documentMetrics.pendingDocuments < 30
                    ? "Moderate document backlog. Monitor closely and consider additional resources if it increases."
                    : "High document backlog. Increase verification staff or implement automated pre-screening."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalytics;
