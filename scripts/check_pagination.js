// Simple manual checker for the paginated endpoint
// Usage: node scripts/check_pagination.js

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
    try {
        const res = await fetch(`${baseUrl}/usos/usos?page=1&limit=1`);
        const json = await res.json();

        console.log('HTTP status:', res.status);

        const hasData = Array.isArray(json.data);
        const hasPage = typeof json.page === 'number';
        const hasLimit = typeof json.limit === 'number';
        const hasTotalItems = typeof json.totalItems === 'number';
        const hasTotalPages = typeof json.totalPages === 'number';

        if (hasData && hasPage && hasLimit && hasTotalItems && hasTotalPages) {
            console.log('✅ Paginated response looks valid.');
            console.log(JSON.stringify(json, null, 2));
            process.exit(0);
        } else {
            console.error('❌ Response missing expected fields.');
            console.error(JSON.stringify(json, null, 2));
            process.exit(2);
        }
    } catch (err) {
        console.error('Error while checking pagination endpoint:', err);
        process.exit(3);
    }
})();