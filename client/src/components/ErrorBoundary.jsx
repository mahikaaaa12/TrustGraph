import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white border border-[#E5E7EB] rounded-2xl shadow-xs space-y-6 text-[#2B2B2B]">
          <div className="flex items-center space-x-3 text-[#D96C6C]">
            <div className="p-3 bg-[#D96C6C]/10 rounded-xl">
              <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Analysis Display Error</h2>
              <p className="text-xs text-[#6B7280]">
                We received the analysis response, but encountered a UI rendering error displaying the results.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-4 bg-[#F8F7F4] rounded-xl border border-[#E5E7EB] space-y-1">
              <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Telemetry Error Details:</span>
              <p className="text-xs font-mono text-[#D96C6C] font-semibold">{this.state.error.toString()}</p>
            </div>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2.5 bg-[#8E9A7D] hover:bg-[#7F8F73] text-white text-xs font-semibold rounded-xl transition-colors flex items-center space-x-2 shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2.5 bg-[#F8F7F4] hover:bg-[#F3F2EF] text-[#2B2B2B] border border-[#E5E7EB] text-xs font-semibold rounded-xl transition-colors flex items-center space-x-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
