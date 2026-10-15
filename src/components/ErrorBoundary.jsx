import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="h-screen w-full bg-[#0B1220] flex items-center justify-center">
                    <div className="text-red-500 font-mono text-xs uppercase tracking-wider">
                        APPLICATION ERROR // PLEASE REFRESH
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
