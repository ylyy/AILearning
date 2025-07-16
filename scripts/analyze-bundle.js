#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Bundle analysis script
class BundleAnalyzer {
  constructor() {
    this.results = {};
  }

  /**
   * Analyze bundle sizes for all packages
   */
  async analyzeAll() {
    console.log('🔍 Analyzing bundle sizes...\n');

    const packages = ['desktop', 'mobile', 'shared'];
    
    for (const pkg of packages) {
      await this.analyzePackage(pkg);
    }

    this.generateReport();
  }

  /**
   * Analyze a specific package
   */
  async analyzePackage(packageName) {
    console.log(`📦 Analyzing ${packageName} package...`);
    
    const packagePath = path.join(__dirname, '..', 'packages', packageName);
    
    if (!fs.existsSync(packagePath)) {
      console.log(`❌ Package ${packageName} not found`);
      return;
    }

    try {
      // Check if package has build output
      const buildPath = path.join(packagePath, 'build');
      const distPath = path.join(packagePath, 'dist');
      
      if (fs.existsSync(buildPath)) {
        this.analyzeBuildOutput(buildPath, packageName);
      } else if (fs.existsSync(distPath)) {
        this.analyzeBuildOutput(distPath, packageName);
      } else {
        console.log(`⚠️  No build output found for ${packageName}`);
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${packageName}:`, error.message);
    }
  }

  /**
   * Analyze build output directory
   */
  analyzeBuildOutput(buildPath, packageName) {
    const files = this.getFilesRecursively(buildPath);
    let totalSize = 0;
    const fileSizes = {};

    files.forEach(file => {
      const relativePath = path.relative(buildPath, file);
      const stats = fs.statSync(file);
      const size = stats.size;
      
      fileSizes[relativePath] = {
        size,
        sizeFormatted: this.formatBytes(size),
        type: path.extname(file).substring(1) || 'unknown'
      };
      
      totalSize += size;
    });

    this.results[packageName] = {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      fileCount: files.length,
      files: fileSizes,
      analysis: this.analyzeFileTypes(fileSizes)
    };

    console.log(`✅ ${packageName}: ${this.formatBytes(totalSize)} (${files.length} files)`);
  }

  /**
   * Get all files recursively from a directory
   */
  getFilesRecursively(dir) {
    const files = [];
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Analyze file types and their sizes
   */
  analyzeFileTypes(files) {
    const types = {};
    
    Object.values(files).forEach(file => {
      const type = file.type;
      if (!types[type]) {
        types[type] = { count: 0, size: 0 };
      }
      types[type].count++;
      types[type].size += file.size;
    });

    // Convert to formatted sizes
    Object.keys(types).forEach(type => {
      types[type].sizeFormatted = this.formatBytes(types[type].size);
    });

    return types;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    console.log('\n📊 Bundle Analysis Report');
    console.log('=' .repeat(50));

    let grandTotal = 0;
    const packageTotals = {};

    Object.entries(this.results).forEach(([packageName, result]) => {
      console.log(`\n📦 ${packageName.toUpperCase()}`);
      console.log(`   Total Size: ${result.totalSizeFormatted}`);
      console.log(`   Files: ${result.fileCount}`);
      
      grandTotal += result.totalSize;
      packageTotals[packageName] = result.totalSize;

      // Show largest files
      const largestFiles = Object.entries(result.files)
        .sort(([, a], [, b]) => b.size - a.size)
        .slice(0, 5);

      if (largestFiles.length > 0) {
        console.log('   Largest Files:');
        largestFiles.forEach(([file, info]) => {
          console.log(`     ${file}: ${info.sizeFormatted}`);
        });
      }

      // Show file type breakdown
      if (Object.keys(result.analysis).length > 0) {
        console.log('   File Types:');
        Object.entries(result.analysis)
          .sort(([, a], [, b]) => b.size - a.size)
          .forEach(([type, info]) => {
            console.log(`     ${type}: ${info.sizeFormatted} (${info.count} files)`);
          });
      }
    });

    console.log('\n📈 SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total Bundle Size: ${this.formatBytes(grandTotal)}`);
    
    // Performance recommendations
    this.generateRecommendations();
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    console.log('\n💡 Performance Recommendations');
    console.log('=' .repeat(50));

    const recommendations = [];

    Object.entries(this.results).forEach(([packageName, result]) => {
      // Check for large bundles
      if (result.totalSize > 5 * 1024 * 1024) { // 5MB
        recommendations.push(`⚠️  ${packageName} bundle is large (${result.totalSizeFormatted}). Consider code splitting.`);
      }

      // Check for large individual files
      Object.entries(result.files).forEach(([file, info]) => {
        if (info.size > 1024 * 1024) { // 1MB
          recommendations.push(`⚠️  Large file in ${packageName}: ${file} (${info.sizeFormatted})`);
        }
      });

      // Check for too many files
      if (result.fileCount > 100) {
        recommendations.push(`⚠️  ${packageName} has many files (${result.fileCount}). Consider bundling.`);
      }
    });

    if (recommendations.length === 0) {
      console.log('✅ Bundle sizes look good!');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }

    // General recommendations
    console.log('\n🔧 General Optimization Tips:');
    console.log('• Use code splitting for large components');
    console.log('• Implement lazy loading for routes');
    console.log('• Optimize images and assets');
    console.log('• Use tree shaking to remove unused code');
    console.log('• Consider using dynamic imports for heavy libraries');
  }

  /**
   * Save report to file
   */
  saveReport() {
    const reportPath = path.join(__dirname, '..', 'bundle-analysis.json');
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalSize: Object.values(this.results).reduce((sum, result) => sum + result.totalSize, 0),
        packageCount: Object.keys(this.results).length
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// Run analysis
async function main() {
  const analyzer = new BundleAnalyzer();
  
  try {
    await analyzer.analyzeAll();
    analyzer.saveReport();
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BundleAnalyzer;