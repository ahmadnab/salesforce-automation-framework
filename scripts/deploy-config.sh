#!/bin/bash

# Salesforce Automation Framework - Deployment Script
# This script deploys all required Salesforce configuration to the target org

set -e

echo "=== Salesforce Automation Framework - Configuration Deployment ==="
echo ""

# Check if SF CLI is installed
if ! command -v sf &> /dev/null; then
    echo "Error: Salesforce CLI (sf) is not installed."
    echo "Please install it from: https://developer.salesforce.com/tools/salesforcecli"
    exit 1
fi

# Get target org from argument or use default
TARGET_ORG=${1:-"myOrg"}

echo "Target Org: $TARGET_ORG"
echo ""

# Verify org connection
echo "Verifying org connection..."
sf org display --target-org "$TARGET_ORG" > /dev/null 2>&1 || {
    echo "Error: Unable to connect to org '$TARGET_ORG'"
    echo "Please authenticate first: sf org login web --alias $TARGET_ORG"
    exit 1
}

echo "✓ Org connection verified"
echo ""

# Deploy custom fields
echo "Deploying custom fields..."
sf project deploy start \
    --source-dir force-app/main/default/objects/Opportunity/fields \
    --target-org "$TARGET_ORG" \
    --wait 10

echo "✓ Custom fields deployed"
echo ""

# Deploy permission sets
echo "Deploying permission sets..."
sf project deploy start \
    --source-dir force-app/main/default/permissionsets \
    --target-org "$TARGET_ORG" \
    --wait 10

echo "✓ Permission sets deployed"
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "Configuration deployed to $TARGET_ORG:"
echo "  - Opportunity.Quantity__c custom field"
echo "  - OpportunityReadOnly permission set"
echo ""
echo "You can now run the tests with: npm test"
