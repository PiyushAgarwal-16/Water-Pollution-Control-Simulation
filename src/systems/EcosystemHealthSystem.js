export default class EcosystemHealthSystem {
    constructor() {
        this.currentState = 'HEALTHY'; // HEALTHY, STRESSED, CRITICAL
        this.healthScore = 100;
        this.previousState = 'HEALTHY';
        this.stateChangeCallback = null;
    }

    /**
     * Calculate ecosystem health score based on multiple factors
     * @param {Object} params - { liveFish, totalFish, avgFishHealth, activePollution, riverHealth }
     * @returns {number} Health score 0-100
     */
    calculateHealth(params) {
        const { liveFish, totalFish, avgFishHealth, activePollution, riverHealth } = params;

        // Fish survival rate (30% weight)
        const survivalRate = totalFish > 0 ? (liveFish / totalFish) * 100 : 0;
        const survivalScore = survivalRate * 0.3;

        // Average fish health (25% weight)
        const fishHealthScore = avgFishHealth * 0.25;

        // Active pollution - inverted (25% weight)
        const pollutionScore = Math.max(0, 100 - activePollution) * 0.25;

        // River health (20% weight)
        const riverScore = riverHealth * 0.2;

        this.healthScore = survivalScore + fishHealthScore + pollutionScore + riverScore;
        return this.healthScore;
    }

    /**
     * Determine ecosystem state based on health score
     */
    updateState() {
        this.previousState = this.currentState;

        if (this.healthScore >= 75) {
            this.currentState = 'HEALTHY';
        } else if (this.healthScore >= 40) {
            this.currentState = 'STRESSED';
        } else {
            this.currentState = 'CRITICAL';
        }

        // Trigger callback if state changed
        if (this.currentState !== this.previousState && this.stateChangeCallback) {
            this.stateChangeCallback(this.currentState, this.previousState, this.healthScore);
        }
    }

    /**
     * Set callback for state changes
     */
    onStateChange(callback) {
        this.stateChangeCallback = callback;
    }

    /**
     * Get current state information
     */
    getStateInfo() {
        const states = {
            HEALTHY: {
                name: 'Healthy',
                icon: '✓',
                color: 0x44ff44,
                colorHex: '#44ff44',
                message: 'Ecosystem is thriving!',
                description: 'Fish are healthy and reproducing. Water quality supports diverse aquatic life.'
            },
            STRESSED: {
                name: 'Stressed',
                icon: '⚠',
                color: 0xffaa44,
                colorHex: '#ffaa44',
                message: 'Ecosystem under stress',
                description: 'Fish struggling to survive. Pollution is accumulating faster than natural recovery.'
            },
            CRITICAL: {
                name: 'Critical',
                icon: '☠',
                color: 0xff4444,
                colorHex: '#ff4444',
                message: 'Ecosystem collapse!',
                description: 'Mass fish deaths. Water is toxic. Immediate action required to prevent permanent damage.'
            }
        };

        return states[this.currentState];
    }

    /**
     * Get educational explanation for state change
     */
    getStateChangeExplanation(newState, oldState) {
        const explanations = {
            'HEALTHY_STRESSED': {
                title: '⚠ Ecosystem Now Stressed',
                cause: 'Pollution levels have exceeded safe thresholds. Fish are experiencing toxic stress.',
                actions: [
                    'Reduce factory output',
                    'Place water filters',
                    'Allow time for natural recovery'
                ]
            },
            'HEALTHY_CRITICAL': {
                title: '☠ Ecosystem Collapse!',
                cause: 'Severe pollution spike or mass fish deaths have devastated the ecosystem.',
                actions: [
                    'Immediately stop all pollution sources',
                    'Deploy multiple water filters',
                    'Long-term remediation required'
                ]
            },
            'STRESSED_CRITICAL': {
                title: '☠ Ecosystem Collapse!',
                cause: 'The stressed ecosystem could not recover. Pollution has overwhelmed natural defenses.',
                actions: [
                    'Emergency intervention needed',
                    'Stop all pollution sources',
                    'Deploy maximum filtration'
                ]
            },
            'STRESSED_HEALTHY': {
                title: '✓ Ecosystem Recovering',
                cause: 'Your pollution control efforts are working! Water quality is improving.',
                actions: [
                    'Maintain current policies',
                    'Continue monitoring',
                    'Gradual recovery in progress'
                ]
            },
            'CRITICAL_STRESSED': {
                title: '⚠ Ecosystem Stabilizing',
                cause: 'Emergency measures are taking effect. Ecosystem is no longer in free fall.',
                actions: [
                    'Continue remediation efforts',
                    'Monitor fish population recovery',
                    'Maintain pollution controls'
                ]
            },
            'CRITICAL_HEALTHY': {
                title: '✓ Ecosystem Restored!',
                cause: 'Comprehensive remediation has succeeded. The ecosystem has fully recovered.',
                actions: [
                    'Maintain strict pollution controls',
                    'Prevent future crises',
                    'Ecosystem is resilient again'
                ]
            }
        };

        const key = `${oldState}_${newState}`;
        return explanations[key] || {
            title: `Ecosystem State Changed`,
            cause: `Ecosystem transitioned from ${oldState} to ${newState}.`,
            actions: ['Monitor the situation closely']
        };
    }
}
