import { useToastStore } from '../store';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const Toast = () => {
    const { toasts, removeToast } = useToastStore();

    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5" />;
            case 'error':
                return <XCircle className="w-5 h-5" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5" />;
            case 'info':
            default:
                return <Info className="w-5 h-5" />;
        }
    };

    const getColors = (type: string) => {
        switch (type) {
            case 'success':
                return 'border-green-500/50 bg-green-950/90 text-green-300';
            case 'error':
                return 'border-red-500/50 bg-red-950/90 text-red-300';
            case 'warning':
                return 'border-yellow-500/50 bg-yellow-950/90 text-yellow-300';
            case 'info':
            default:
                return 'border-blue-500/50 bg-blue-950/90 text-blue-300';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-start gap-3 p-4 border backdrop-blur-md shadow-xl animate-in slide-in-from-right duration-300 ${getColors(toast.type)}`}
                >
                    <div className="flex-shrink-0 mt-0.5">
                        {getIcon(toast.type)}
                    </div>
                    <p className="flex-1 text-sm leading-relaxed break-words">
                        {toast.message}
                    </p>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="flex-shrink-0 hover:opacity-70 transition-opacity"
                        aria-label="Close notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default Toast;
