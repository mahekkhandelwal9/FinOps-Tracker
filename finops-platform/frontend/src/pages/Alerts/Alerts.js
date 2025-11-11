import React, { useState, useEffect } from 'react';
import { BellIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    fetchPods();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/alerts');
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPods = async () => {
    try {
      const response = await api.get('/pods');
      setPods(response.data.pods || []);
    } catch (error) {
      console.error('Error fetching pods:', error);
      setPods([]);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}`, { status: 'Resolved' });
      fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'Invoice Overdue':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />;
      case 'Invoice Due':
        return <BellIcon className="h-6 w-6 text-yellow-600" />;
      case 'Budget Threshold':
        return <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />;
      case 'Manual':
        return <InformationCircleIcon className="h-6 w-6 text-blue-600" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'Medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'Low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    return status === 'Resolved'
      ? 'bg-green-50 text-green-700'
      : 'bg-gray-100 text-gray-700';
  };

  const filteredAlerts = alerts.filter(alert => alert.status !== 'Resolved');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-gray-600">System notifications and important reminders</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 p-3 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">High Priority</div>
              <div className="text-2xl font-bold text-gray-900">
                {filteredAlerts.filter(a => a.severity === 'High').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-lg">
              <BellIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Medium Priority</div>
              <div className="text-2xl font-bold text-gray-900">
                {filteredAlerts.filter(a => a.severity === 'Medium').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg">
              <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Low Priority</div>
              <div className="text-2xl font-bold text-gray-900">
                {filteredAlerts.filter(a => a.severity === 'Low').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 p-3 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Resolved</div>
              <div className="text-2xl font-bold text-gray-900">
                {alerts.filter(a => a.status === 'Resolved').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>

        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
            <p className="mt-1 text-sm text-gray-500">
              No active alerts at the moment.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const pod = pods.find(p => p.pod_id === alert.related_pod_id);

            return (
              <div
                key={alert.alert_id}
                className={`bg-white border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium">{alert.alert_type}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          alert.severity === 'High' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{alert.alert_message}</p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        {pod && (
                          <span>Pod: {pod.pod_name}</span>
                        )}
                        <span>Created: {new Date(alert.created_at).toLocaleDateString('en-IN')}</span>
                        {alert.due_date && (
                          <span>Due: {new Date(alert.due_date).toLocaleDateString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {alert.status !== 'Resolved' && (
                      <button
                        onClick={() => handleResolveAlert(alert.alert_id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Mark as resolved"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolved Alerts */}
      {alerts.filter(a => a.status === 'Resolved').length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Recently Resolved</h2>

          <div className="space-y-2">
            {alerts
              .filter(a => a.status === 'Resolved')
              .slice(0, 5)
              .map((alert) => {
                const pod = pods.find(p => p.pod_id === alert.related_pod_id);

                return (
                  <div
                    key={alert.alert_id}
                    className="bg-white border border-gray-200 rounded-lg p-3 opacity-75"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{alert.alert_type}</div>
                          <div className="text-xs text-gray-500">
                            {pod?.pod_name && `Pod: ${pod.pod_name} • `}
                            Resolved: {new Date(alert.resolved_at || alert.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">
                        Resolved
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;