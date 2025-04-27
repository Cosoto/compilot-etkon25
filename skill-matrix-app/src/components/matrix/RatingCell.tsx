import React, { useState, useEffect } from 'react';

// TODO: Define rating levels/colors if needed
const RATING_LEVELS = [1, 2, 3, 4, 5]; // Removed 0 as it's handled by the empty state

type RatingCellProps = {
    employeeId: string;
    stationId: string;
    currentRating: number | null | undefined;
    isEditable: boolean;
    onRatingChange?: (employeeId: string, stationId: string, newRating: number | null) => Promise<void>;
};

// Helper function to mimic basic cn functionality for this component
const combineClasses = (...classes: (string | undefined | null | boolean | {[key: string]: boolean})[]): string => {
    const finalClasses: string[] = [];
    classes.forEach(cls => {
        if (typeof cls === 'string') {
            finalClasses.push(cls);
        } else if (typeof cls === 'object' && cls !== null) {
            Object.keys(cls).forEach(key => {
                if (cls[key]) {
                    finalClasses.push(key);
                }
            });
        }
    });
    return finalClasses.join(' ');
};

const RatingCell: React.FC<RatingCellProps> = ({
    employeeId,
    stationId,
    currentRating,
    isEditable,
    onRatingChange,
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (!onRatingChange) return;

        setIsSaving(true);
        setShowSuccess(false);
        try {
            // Send null to remove the rating when selecting the default option
            const newRating = value === '' ? null : parseInt(value, 10);
            await onRatingChange(employeeId, stationId, newRating);
            setShowSuccess(true);
        } catch (error) {
            console.error("RatingCell: Save failed", error);
        } finally {
            setIsSaving(false);
            if (showSuccess) {
                setTimeout(() => setShowSuccess(false), 1500);
            }
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showSuccess) {
            timer = setTimeout(() => {
                setShowSuccess(false);
            }, 1500);
        }
        return () => clearTimeout(timer);
    }, [showSuccess]);

    const ratingValue = currentRating ?? -1;
    const cellStyle = combineClasses(
        'p-1 rounded text-center text-sm',
        {
            'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200': ratingValue >= 4,
            'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200': ratingValue >= 2 && ratingValue < 4,
            'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200': ratingValue > 0 && ratingValue < 2,
            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400': ratingValue <= 0,
        }
    );

    if (isEditable) {
        return (
            <div className="relative">
                <select
                    value={currentRating ?? ''}
                    onChange={handleSelectChange}
                    disabled={isSaving}
                    className={combineClasses(
                        'block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md',
                        cellStyle,
                        { 'opacity-50 cursor-not-allowed': isSaving },
                        { 'ring-2 ring-offset-1 ring-green-500': showSuccess }
                    )}
                    aria-label={`Skill rating for station ${stationId}`}
                    {...(isSaving ? { 'aria-busy': 'true' } : {})}
                >
                    <option value="">-- Rate --</option>
                    {RATING_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
            </div>
        );
    }

    // Read-only view
    return (
        <div
            className={combineClasses(cellStyle)}
            aria-label={`Skill rating: ${currentRating ?? 'Not Rated'}`}
            tabIndex={0}
        >
            {currentRating ?? '-'}
        </div>
    );
};

export default RatingCell; 