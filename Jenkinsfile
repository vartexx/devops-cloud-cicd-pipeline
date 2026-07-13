pipeline {
    agent any

    environment {
        DOCKER_REGISTRY_CREDENTIALS = 'dockerhub-credentials-id'
        AWS_KUBECONFIG_CREDENTIALS  = 'aws-kubeconfig-credentials-id'
        IMAGE_NAME                  = 'harsh/devops-dashboard'
        PORT                        = '3000'
    }

    options {
        timeout(time: 1, unit: 'HOURS')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code from Git Repository...'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing Node dependencies...'
                sh 'npm ci'
            }
        }

        stage('Security Scan') {
            steps {
                echo 'Auditing packages for known vulnerabilities...'
                sh 'npm audit --audit-level=high || true'
            }
        }

        stage('Run Tests') {
            steps {
                echo 'Running unit test suite...'
                sh 'npm test'
            }
        }

        stage('Docker Build') {
            steps {
                echo 'Building Docker Image from Multi-stage Dockerfile...'
                sh "docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest ."
            }
        }

        stage('Docker Publish') {
            steps {
                echo 'Logging in and pushing image to DockerHub registry...'
                withCredentials([usernamePassword(credentialsId: "${DOCKER_REGISTRY_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh "echo ${DOCKER_PASS} | docker login -u ${DOCKER_USER} --password-stdin"
                    sh "docker push ${IMAGE_NAME}:${BUILD_NUMBER}"
                    sh "docker push ${IMAGE_NAME}:latest"
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                echo 'Updating service manifests and triggering rolling update...'
                withCredentials([file(credentialsId: "${AWS_KUBECONFIG_CREDENTIALS}", variable: 'KUBECONFIG')]) {
                    sh 'kubectl apply -f k8s/deployment.yaml --kubeconfig=${KUBECONFIG}'
                    sh 'kubectl apply -f k8s/service.yaml --kubeconfig=${KUBECONFIG}'
                    sh 'kubectl apply -f k8s/hpa.yaml --kubeconfig=${KUBECONFIG}'
                    sh "kubectl set image deployment/devops-dashboard-deployment web=${IMAGE_NAME}:${BUILD_NUMBER} --kubeconfig=${KUBECONFIG}"
                    sh 'kubectl rollout status deployment/devops-dashboard-deployment --kubeconfig=${KUBECONFIG}'
                }
            }
        }
    }

    post {
        always {
            echo 'Cleaning up workspaces...'
            cleanWs()
        }
        success {
            echo 'CI/CD Pipeline ran successfully! Cluster updated.'
        }
        failure {
            echo 'Pipeline failed. Triggering notifications...'
        }
    }
}
